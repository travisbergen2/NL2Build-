package com.nl2build.app.services

import com.nl2build.app.models.*
import kotlinx.coroutines.delay
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.concurrent.TimeUnit

class AIService(
    private val anthropicApiKey: String,
    private val backendUrl: String
) {
    private val json = Json {
        ignoreUnknownKeys = true
        prettyPrint = true
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    /**
     * Layer 1 AI: Analyzes natural language description and creates structured app specification
     */
    suspend fun analyzeDescription(description: String): Result<AnalyzeDescriptionResponse> {
        return try {
            val prompt = buildLayer1Prompt(description)
            val response = callAnthropicAPI(prompt)

            // Parse AI response to create AppSpecification
            val specification = parseLayer1Response(response)

            val result = AnalyzeDescriptionResponse(
                specification = specification,
                projectId = java.util.UUID.randomUUID().toString(),
                estimatedBuildTime = 120
            )

            Result.success(result)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Layer 2 AI: Takes app specification and generates complete Android project structure
     */
    suspend fun generateProject(specification: AppSpecification, projectId: String): Result<GenerateProjectResponse> {
        return try {
            val prompt = buildLayer2Prompt(specification)
            val response = callAnthropicAPI(prompt)

            // Parse AI response to create project structure
            val projectStructure = parseLayer2Response(response)

            val result = GenerateProjectResponse(
                projectId = projectId,
                projectStructure = projectStructure,
                buildJobId = java.util.UUID.randomUUID().toString()
            )

            Result.success(result)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun buildLayer1Prompt(description: String): String {
        return """
You are an expert Android app architect. Analyze the following app description and create a detailed technical specification.

User's App Description:
$description

Please provide a comprehensive app specification in the following JSON format:
{
  "appName": "string",
  "packageName": "com.example.appname",
  "description": "detailed description",
  "features": ["feature1", "feature2"],
  "screens": [
    {
      "name": "MainScreen",
      "type": "MAIN",
      "components": [
        {
          "type": "TEXT",
          "label": "Welcome",
          "properties": {}
        }
      ],
      "navigation": ["DetailScreen"]
    }
  ],
  "theme": {
    "primaryColor": "#6750A4",
    "secondaryColor": "#625B71",
    "useDarkMode": false,
    "useMaterial3": true
  },
  "minSdkVersion": 26,
  "targetSdkVersion": 34
}

Component types: TEXT, BUTTON, IMAGE, INPUT, LIST, CARD, CHECKBOX, RADIO, DROPDOWN, SWITCH
Screen types: MAIN, DETAIL, FORM, LIST, SETTINGS, SPLASH, LOGIN, DASHBOARD

Respond with ONLY the JSON specification, no additional text.
        """.trimIndent()
    }

    private fun buildLayer2Prompt(specification: AppSpecification): String {
        val specJson = json.encodeToString(specification)

        return """
You are an expert Android developer. Generate a complete, production-ready Android app project structure based on this specification.

App Specification:
$specJson

Generate a complete Android project with:
1. build.gradle.kts files for app module
2. AndroidManifest.xml with all required permissions and components
3. Kotlin source files using Jetpack Compose for all screens
4. Navigation setup using Navigation Compose
5. Material 3 theming
6. Proper state management with ViewModels
7. All necessary resources (strings, colors, themes)

Provide the output as a JSON object mapping file paths to file contents:
{
  "files": {
    "app/build.gradle.kts": "content...",
    "app/src/main/AndroidManifest.xml": "content...",
    "app/src/main/java/[package]/MainActivity.kt": "content...",
    ...
  },
  "dependencies": [
    "androidx.compose.material3:material3:1.1.2",
    ...
  ]
}

Make the code production-ready, follow Android best practices, and ensure it compiles without errors.
Respond with ONLY the JSON, no additional text.
        """.trimIndent()
    }

    private suspend fun callAnthropicAPI(prompt: String): String {
        // Use Gson for proper JSON encoding
        val requestMap = mapOf(
            // NOTE: claude-3-5-sonnet-20241022 was retired; keep this current or
            // prefer the server-side pipeline (POST /api/generate), which resolves
            // the model dynamically and needs no client-side API key.
            "model" to "claude-sonnet-4-5",
            "max_tokens" to 4096,
            "messages" to listOf(
                mapOf(
                    "role" to "user",
                    "content" to prompt
                )
            )
        )

        val gson = com.google.gson.Gson()
        val requestBody = gson.toJson(requestMap)

        val request = Request.Builder()
            .url("https://api.anthropic.com/v1/messages")
            .addHeader("x-api-key", anthropicApiKey)
            .addHeader("anthropic-version", "2023-06-01")
            .addHeader("content-type", "application/json")
            .post(requestBody.toRequestBody("application/json".toMediaType()))
            .build()

        val response = client.newCall(request).execute()
        if (!response.isSuccessful) {
            throw Exception("API call failed: ${response.code} - ${response.body?.string()}")
        }

        val responseBody = response.body?.string()
            ?: throw Exception("Empty response from API")

        // Parse Anthropic response and extract text content
        return extractTextFromAnthropicResponse(responseBody)
    }

    private fun extractTextFromAnthropicResponse(responseBody: String): String {
        // Parse the Anthropic API response format using Gson
        val gson = com.google.gson.Gson()
        val jsonResponse = gson.fromJson(responseBody, com.google.gson.JsonObject::class.java)

        val contentArray = jsonResponse.getAsJsonArray("content")
        if (contentArray != null && contentArray.size() > 0) {
            val firstContent = contentArray.get(0).asJsonObject
            val text = firstContent.get("text")?.asString
            if (text != null) {
                return text
            }
        }

        throw Exception("Could not extract text from API response")
    }

    private fun parseLayer1Response(response: String): AppSpecification {
        // Extract JSON from response (remove markdown code blocks if present)
        val jsonText = response
            .replace("```json", "")
            .replace("```", "")
            .trim()

        return json.decodeFromString<AppSpecification>(jsonText)
    }

    private fun parseLayer2Response(response: String): ProjectStructure {
        // Extract JSON from response (remove markdown code blocks if present)
        val jsonText = response
            .replace("```json", "")
            .replace("```", "")
            .trim()

        return json.decodeFromString<ProjectStructure>(jsonText)
    }

    /**
     * Submit project to backend for building
     */
    suspend fun submitBuild(projectStructure: ProjectStructure, projectId: String, buildJobId: String): Result<BuildStatusResponse> {
        return try {
            val requestBody = json.encodeToString(
                mapOf(
                    "projectId" to projectId,
                    "buildJobId" to buildJobId,
                    "projectStructure" to projectStructure
                )
            ).toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url("$backendUrl/api/build") // was "$backendUrl/build" — server mounts /api/build
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                throw Exception("Build submission failed: ${response.code}")
            }

            val responseBody = response.body?.string()
                ?: throw Exception("Empty response")

            val buildResponse = json.decodeFromString<BuildStatusResponse>(responseBody)
            Result.success(buildResponse)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Check build status
     */
    suspend fun checkBuildStatus(projectId: String, buildJobId: String): Result<BuildStatusResponse> {
        return try {
            val request = Request.Builder()
                .url("$backendUrl/build/$buildJobId/status")
                .get()
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                throw Exception("Status check failed: ${response.code}")
            }

            val responseBody = response.body?.string()
                ?: throw Exception("Empty response")

            val statusResponse = json.decodeFromString<BuildStatusResponse>(responseBody)
            Result.success(statusResponse)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
