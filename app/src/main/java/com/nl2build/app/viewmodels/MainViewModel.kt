package com.nl2build.app.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nl2build.app.data.PreferencesManager
import com.nl2build.app.data.ProjectRepository
import com.nl2build.app.models.AppProject
import com.nl2build.app.models.BuildStatus
import com.nl2build.app.services.AIService
import com.nl2build.app.services.BuildService
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class MainViewModel(
    private val preferencesManager: PreferencesManager,
    private val projectRepository: ProjectRepository,
    private val buildService: BuildService
) : ViewModel() {

    val projects = projectRepository.projects
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _currentProject = MutableStateFlow<AppProject?>(null)
    val currentProject = _currentProject.asStateFlow()

    private val _isProcessing = MutableStateFlow(false)
    val isProcessing = _isProcessing.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage = _errorMessage.asStateFlow()

    private val _buildProgress = MutableStateFlow(0)
    val buildProgress = _buildProgress.asStateFlow()

    private val _buildMessage = MutableStateFlow("")
    val buildMessage = _buildMessage.asStateFlow()

    val apiKey = preferencesManager.anthropicApiKey
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val backendUrl = preferencesManager.backendUrl
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), "")

    fun generateApp(description: String) {
        if (description.isBlank()) {
            _errorMessage.value = "Please provide a description"
            return
        }

        val currentApiKey = apiKey.value
        if (currentApiKey.isNullOrBlank()) {
            _errorMessage.value = "Please configure your API key in settings"
            return
        }

        viewModelScope.launch {
            try {
                _isProcessing.value = true
                _errorMessage.value = null
                _buildProgress.value = 0
                _buildMessage.value = "Initializing..."

                // Create project
                val appName = extractAppName(description)
                val project = projectRepository.createProject(appName, description)
                _currentProject.value = project

                // Initialize AI service
                val aiService = AIService(currentApiKey, backendUrl.value)

                // Layer 1: Analyze description
                _buildMessage.value = "Layer 1 AI: Analyzing your description..."
                _buildProgress.value = 10
                projectRepository.updateProjectStatus(project.id, BuildStatus.ANALYZING)

                val layer1Result = aiService.analyzeDescription(description)
                if (layer1Result.isFailure) {
                    throw layer1Result.exceptionOrNull() ?: Exception("Layer 1 analysis failed")
                }

                val analysisResponse = layer1Result.getOrNull()!!
                _buildProgress.value = 30

                // Update project with specification
                val updatedProject = project.copy(specification = analysisResponse.specification)
                projectRepository.updateProject(updatedProject)
                _currentProject.value = updatedProject

                // Layer 2: Generate project structure
                _buildMessage.value = "Layer 2 AI: Building Android project..."
                _buildProgress.value = 40
                projectRepository.updateProjectStatus(project.id, BuildStatus.GENERATING)

                val layer2Result = aiService.generateProject(
                    analysisResponse.specification,
                    project.id
                )
                if (layer2Result.isFailure) {
                    throw layer2Result.exceptionOrNull() ?: Exception("Layer 2 generation failed")
                }

                val generationResponse = layer2Result.getOrNull()!!
                _buildProgress.value = 60

                // Submit to CI/CD for building
                _buildMessage.value = "Submitting to CI/CD pipeline..."
                _buildProgress.value = 65
                projectRepository.updateProjectStatus(project.id, BuildStatus.BUILDING)

                val buildResult = aiService.submitBuild(
                    generationResponse.projectStructure,
                    project.id,
                    generationResponse.buildJobId
                )

                if (buildResult.isFailure) {
                    throw buildResult.exceptionOrNull() ?: Exception("Build submission failed")
                }

                // Wait for build to complete
                _buildMessage.value = "Building and signing app..."
                _buildProgress.value = 70

                val buildStatusResult = buildService.waitForBuild(
                    project.id,
                    generationResponse.buildJobId
                ) { status, progress, message ->
                    _buildProgress.value = 70 + (progress * 0.3).toInt()
                    _buildMessage.value = message
                    projectRepository.updateProjectStatus(project.id, status)
                }

                if (buildStatusResult.isFailure) {
                    throw buildStatusResult.exceptionOrNull() ?: Exception("Build failed")
                }

                val buildStatus = buildStatusResult.getOrNull()!!

                // Update project with download URLs
                projectRepository.setProjectUrls(
                    project.id,
                    buildStatus.apkUrl,
                    buildStatus.aabUrl
                )

                projectRepository.updateProjectStatus(project.id, BuildStatus.READY)
                _buildProgress.value = 100
                _buildMessage.value = "Your app is ready!"

                // Reload current project
                _currentProject.value = projectRepository.getProject(project.id)

            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "An error occurred"
                _buildMessage.value = "Failed: ${e.message}"
                currentProject.value?.let {
                    projectRepository.updateProjectStatus(
                        it.id,
                        BuildStatus.FAILED,
                        e.message
                    )
                }
            } finally {
                _isProcessing.value = false
            }
        }
    }

    fun installApp(apkUrl: String) {
        viewModelScope.launch {
            try {
                _buildMessage.value = "Downloading APK..."
                val downloadResult = buildService.downloadApk(apkUrl)

                if (downloadResult.isFailure) {
                    throw downloadResult.exceptionOrNull() ?: Exception("Download failed")
                }

                val apkFile = downloadResult.getOrNull()!!
                _buildMessage.value = "Installing..."

                val installResult = buildService.installApk(apkFile)
                if (installResult.isFailure) {
                    throw installResult.exceptionOrNull() ?: Exception("Installation failed")
                }

                _buildMessage.value = "Installation started"
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Installation failed"
            }
        }
    }

    fun downloadAab(aabUrl: String) {
        viewModelScope.launch {
            try {
                _buildMessage.value = "Downloading AAB..."
                val downloadResult = buildService.downloadAab(aabUrl)

                if (downloadResult.isFailure) {
                    throw downloadResult.exceptionOrNull() ?: Exception("Download failed")
                }

                _buildMessage.value = "AAB downloaded successfully"
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "Download failed"
            }
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }

    fun clearCurrentProject() {
        _currentProject.value = null
        _buildProgress.value = 0
        _buildMessage.value = ""
    }

    private fun extractAppName(description: String): String {
        // Simple heuristic to extract app name from description
        val words = description.split(" ")
        return if (words.size >= 3) {
            words.take(3).joinToString(" ")
        } else {
            "My App"
        }
    }

    fun saveSettings(apiKey: String, backendUrl: String) {
        viewModelScope.launch {
            preferencesManager.saveAnthropicApiKey(apiKey)
            preferencesManager.saveBackendUrl(backendUrl)
        }
    }
}
