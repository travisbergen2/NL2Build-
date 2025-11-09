package com.nl2build.app.models

import kotlinx.serialization.Serializable

// Layer 1 AI Request
@Serializable
data class AnalyzeDescriptionRequest(
    val description: String,
    val userId: String? = null
)

// Layer 1 AI Response
@Serializable
data class AnalyzeDescriptionResponse(
    val specification: AppSpecification,
    val projectId: String,
    val estimatedBuildTime: Int // in seconds
)

// Layer 2 AI Request
@Serializable
data class GenerateProjectRequest(
    val specification: AppSpecification,
    val projectId: String
)

// Layer 2 AI Response
@Serializable
data class GenerateProjectResponse(
    val projectId: String,
    val projectStructure: ProjectStructure,
    val buildJobId: String
)

@Serializable
data class ProjectStructure(
    val files: Map<String, String>, // path -> content
    val dependencies: List<String>
)

// Build Status Request
@Serializable
data class BuildStatusRequest(
    val projectId: String,
    val buildJobId: String
)

// Build Status Response
@Serializable
data class BuildStatusResponse(
    val projectId: String,
    val status: BuildStatus,
    val progress: Int, // 0-100
    val message: String,
    val apkUrl: String? = null,
    val aabUrl: String? = null,
    val error: String? = null
)

// Installation Request
@Serializable
data class InstallRequest(
    val apkUrl: String
)

// Play Console Upload Request
@Serializable
data class PlayConsoleUploadRequest(
    val aabUrl: String,
    val releaseNotes: String,
    val track: String = "internal" // internal, alpha, beta, production
)

@Serializable
data class PlayConsoleUploadResponse(
    val success: Boolean,
    val uploadId: String? = null,
    val error: String? = null
)
