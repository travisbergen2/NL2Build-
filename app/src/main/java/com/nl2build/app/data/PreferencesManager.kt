package com.nl2build.app.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.map

/**
 * Stores user credentials (the Anthropic API key) and settings using
 * [EncryptedSharedPreferences], so secrets are encrypted at rest with a
 * master key held in the Android Keystore.
 *
 * This replaces the previous plaintext DataStore implementation, which stored
 * the API key unencrypted despite documentation claiming otherwise. The public
 * API (Flows + suspend setters) is unchanged, so callers need no modification.
 */
class PreferencesManager(private val context: Context) {

    companion object {
        private const val PREFS_FILE = "nl2build_secure_settings"
        private const val KEY_ANTHROPIC_API_KEY = "anthropic_api_key"
        private const val KEY_BACKEND_URL = "backend_url"

        // No backend is bundled. The app must be pointed at a real backend in
        // Settings before a build can be submitted. An empty default makes an
        // unconfigured state fail honestly instead of hitting a fake domain.
        const val DEFAULT_BACKEND_URL = ""
    }

    private val prefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        EncryptedSharedPreferences.create(
            context,
            PREFS_FILE,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    /** Emit the current value and re-emit whenever [key] changes. */
    private fun stringFlow(key: String, default: String?): Flow<String?> = callbackFlow {
        trySend(prefs.getString(key, default))
        val listener = SharedPreferences.OnSharedPreferenceChangeListener { sp, changedKey ->
            if (changedKey == key) {
                trySend(sp.getString(key, default))
            }
        }
        prefs.registerOnSharedPreferenceChangeListener(listener)
        awaitClose { prefs.unregisterOnSharedPreferenceChangeListener(listener) }
    }

    val anthropicApiKey: Flow<String?> = stringFlow(KEY_ANTHROPIC_API_KEY, null)

    val backendUrl: Flow<String> =
        stringFlow(KEY_BACKEND_URL, DEFAULT_BACKEND_URL).map { it ?: DEFAULT_BACKEND_URL }

    suspend fun saveAnthropicApiKey(apiKey: String) {
        prefs.edit().putString(KEY_ANTHROPIC_API_KEY, apiKey).apply()
    }

    suspend fun saveBackendUrl(url: String) {
        prefs.edit().putString(KEY_BACKEND_URL, url).apply()
    }

    suspend fun clearAll() {
        prefs.edit().clear().apply()
    }
}
