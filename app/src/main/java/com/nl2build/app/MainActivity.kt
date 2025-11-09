package com.nl2build.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.nl2build.app.ui.screens.HomeScreen
import com.nl2build.app.ui.screens.ProjectsScreen
import com.nl2build.app.ui.screens.SettingsScreen
import com.nl2build.app.ui.theme.NL2BuildTheme
import com.nl2build.app.viewmodels.MainViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            NL2BuildTheme {
                MainApp()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainApp() {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: "home"

    val viewModel: MainViewModel = viewModel(
        factory = (androidx.compose.ui.platform.LocalContext.current.applicationContext as NL2BuildApplication)
            .viewModelFactory
    )

    val projects by viewModel.projects.collectAsState()
    val currentProject by viewModel.currentProject.collectAsState()
    val isProcessing by viewModel.isProcessing.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val buildProgress by viewModel.buildProgress.collectAsState()
    val buildMessage by viewModel.buildMessage.collectAsState()
    val apiKey by viewModel.apiKey.collectAsState()
    val backendUrl by viewModel.backendUrl.collectAsState()

    // Show error snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(errorMessage) {
        errorMessage?.let { message ->
            snackbarHostState.showSnackbar(
                message = message,
                duration = SnackbarDuration.Long
            )
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        when (currentRoute) {
                            "home" -> "NL2Build"
                            "projects" -> "My Projects"
                            "settings" -> "Settings"
                            else -> "NL2Build"
                        }
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                    label = { Text("Home") },
                    selected = currentRoute == "home",
                    onClick = {
                        navController.navigate("home") {
                            popUpTo("home") { inclusive = true }
                        }
                    }
                )

                NavigationBarItem(
                    icon = { Icon(Icons.Default.Folder, contentDescription = "Projects") },
                    label = { Text("Projects") },
                    selected = currentRoute == "projects",
                    onClick = {
                        navController.navigate("projects") {
                            popUpTo("home")
                        }
                    }
                )

                NavigationBarItem(
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings") },
                    selected = currentRoute == "settings",
                    onClick = {
                        navController.navigate("settings") {
                            popUpTo("home")
                        }
                    }
                )
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(paddingValues)
        ) {
            composable("home") {
                HomeScreen(
                    isProcessing = isProcessing,
                    buildProgress = buildProgress,
                    buildMessage = buildMessage,
                    currentProjectName = currentProject?.name,
                    currentProjectApkUrl = currentProject?.apkUrl,
                    currentProjectAabUrl = currentProject?.aabUrl,
                    onGenerateApp = { description ->
                        viewModel.generateApp(description)
                    },
                    onInstallApp = { apkUrl ->
                        viewModel.installApp(apkUrl)
                    },
                    onDownloadAab = { aabUrl ->
                        viewModel.downloadAab(aabUrl)
                    },
                    onClearProject = {
                        viewModel.clearCurrentProject()
                    }
                )
            }

            composable("projects") {
                ProjectsScreen(
                    projects = projects,
                    onProjectClick = { project ->
                        // Could navigate to detail screen or show dialog
                    }
                )
            }

            composable("settings") {
                SettingsScreen(
                    currentApiKey = apiKey,
                    currentBackendUrl = backendUrl,
                    onSaveSettings = { key, url ->
                        viewModel.saveSettings(key, url)
                    }
                )
            }
        }
    }
}
