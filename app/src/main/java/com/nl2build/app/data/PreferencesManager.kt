package com.nl2build.app.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "settings")

class PreferencesManager(private val context: Context) {

    companion object {
        private val ANTHROPIC_API_KEY = stringPreferencesKey("anthropic_api_key")
        private val BACKEND_URL = stringPreferencesKey("backend_url")

        // Default backend URL - you'll need to deploy this backend
        private const val DEFAULT_BACKEND_URL = "https://nl2build-backend.your-domain.com/api"
    }

    val anthropicApiKey: Flow<String?> = context.dataStore.data.map { preferences ->
        preferences[ANTHROPIC_API_KEY]
    }

    val backendUrl: Flow<String> = context.dataStore.data.map { preferences ->
        preferences[BACKEND_URL] ?: DEFAULT_BACKEND_URL
    }

    suspend fun saveAnthropicApiKey(apiKey: String) {
        context.dataStore.edit { preferences ->
            preferences[ANTHROPIC_API_KEY] = apiKey
        }
    }

    suspend fun saveBackendUrl(url: String) {
        context.dataStore.edit { preferences ->
            preferences[BACKEND_URL] = url
        }
    }

    suspend fun clearAll() {
        context.dataStore.edit { it.clear() }
    }
}
