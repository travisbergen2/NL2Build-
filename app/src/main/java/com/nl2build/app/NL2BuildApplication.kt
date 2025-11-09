package com.nl2build.app

import android.app.Application
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.nl2build.app.data.PreferencesManager
import com.nl2build.app.data.ProjectRepository
import com.nl2build.app.services.BuildService
import com.nl2build.app.viewmodels.MainViewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

class NL2BuildApplication : Application() {

    lateinit var preferencesManager: PreferencesManager
        private set

    lateinit var projectRepository: ProjectRepository
        private set

    lateinit var viewModelFactory: ViewModelProvider.Factory
        private set

    override fun onCreate() {
        super.onCreate()

        // Initialize dependencies
        preferencesManager = PreferencesManager(this)
        projectRepository = ProjectRepository()

        // Create ViewModelFactory
        viewModelFactory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T {
                if (modelClass.isAssignableFrom(MainViewModel::class.java)) {
                    // Get initial API key and backend URL synchronously
                    // In a production app, you might want to handle this differently
                    val apiKey = runBlocking { preferencesManager.anthropicApiKey.first() } ?: ""
                    val backendUrl = runBlocking { preferencesManager.backendUrl.first() }

                    // Create AIService with current settings
                    val aiService = com.nl2build.app.services.AIService(apiKey, backendUrl)
                    val buildService = BuildService(applicationContext, aiService)

                    return MainViewModel(
                        preferencesManager,
                        projectRepository,
                        buildService
                    ) as T
                }
                throw IllegalArgumentException("Unknown ViewModel class")
            }
        }
    }
}
