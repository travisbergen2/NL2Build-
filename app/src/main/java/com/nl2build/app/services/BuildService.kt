package com.nl2build.app.services

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.nl2build.app.models.BuildStatus
import com.nl2build.app.models.BuildStatusResponse
import kotlinx.coroutines.delay
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.util.concurrent.TimeUnit

class BuildService(
    private val context: Context,
    private val aiService: AIService
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    /**
     * Poll build status until complete
     */
    suspend fun waitForBuild(
        projectId: String,
        buildJobId: String,
        onProgress: (BuildStatus, Int, String) -> Unit
    ): Result<BuildStatusResponse> {
        var attempts = 0
        val maxAttempts = 120 // 10 minutes max (5 second intervals)

        while (attempts < maxAttempts) {
            val result = aiService.checkBuildStatus(projectId, buildJobId)

            if (result.isSuccess) {
                val status = result.getOrNull()!!
                onProgress(status.status, status.progress, status.message)

                when (status.status) {
                    BuildStatus.READY -> return Result.success(status)
                    BuildStatus.FAILED -> return Result.failure(Exception(status.error ?: "Build failed"))
                    else -> {
                        // Still building, wait and retry
                        delay(5000)
                        attempts++
                    }
                }
            } else {
                // Network error, retry
                delay(5000)
                attempts++
            }
        }

        return Result.failure(Exception("Build timeout"))
    }

    /**
     * Download APK file
     */
    suspend fun downloadApk(url: String): Result<File> {
        return try {
            val request = Request.Builder()
                .url(url)
                .get()
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                throw Exception("Download failed: ${response.code}")
            }

            val downloadsDir = File(context.getExternalFilesDir(null), "downloads")
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs()
            }

            val apkFile = File(downloadsDir, "app-${System.currentTimeMillis()}.apk")
            response.body?.byteStream()?.use { input ->
                apkFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            }

            Result.success(apkFile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Download AAB file
     */
    suspend fun downloadAab(url: String): Result<File> {
        return try {
            val request = Request.Builder()
                .url(url)
                .get()
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                throw Exception("Download failed: ${response.code}")
            }

            val downloadsDir = File(context.getExternalFilesDir(null), "downloads")
            if (!downloadsDir.exists()) {
                downloadsDir.mkdirs()
            }

            val aabFile = File(downloadsDir, "app-${System.currentTimeMillis()}.aab")
            response.body?.byteStream()?.use { input ->
                aabFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            }

            Result.success(aabFile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Install APK on device
     */
    fun installApk(apkFile: File): Result<Unit> {
        return try {
            val uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apkFile
            )

            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            context.startActivity(intent)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
