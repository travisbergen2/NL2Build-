package com.nl2build.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.nl2build.app.models.BuildStatus

@Composable
fun HomeScreen(
    isProcessing: Boolean,
    buildProgress: Int,
    buildMessage: String,
    currentProjectName: String?,
    currentProjectApkUrl: String?,
    currentProjectAabUrl: String?,
    onGenerateApp: (String) -> Unit,
    onInstallApp: (String) -> Unit,
    onDownloadAab: (String) -> Unit,
    onClearProject: () -> Unit
) {
    var description by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Header
        Icon(
            imageVector = Icons.Default.Build,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.primary
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "NL2Build",
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.primary
        )

        Text(
            text = "Build Android Apps with Natural Language",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Show result if app is ready
        if (currentProjectApkUrl != null || currentProjectAabUrl != null) {
            AppReadyCard(
                projectName = currentProjectName ?: "Your App",
                apkUrl = currentProjectApkUrl,
                aabUrl = currentProjectAabUrl,
                onInstall = onInstallApp,
                onDownloadAab = onDownloadAab,
                onNewApp = {
                    description = ""
                    onClearProject()
                }
            )
        } else if (isProcessing) {
            // Show progress
            BuildProgressCard(
                progress = buildProgress,
                message = buildMessage
            )
        } else {
            // Input form
            AppDescriptionInput(
                description = description,
                onDescriptionChange = { description = it },
                onGenerate = { onGenerateApp(description) },
                enabled = !isProcessing
            )
        }
    }
}

@Composable
fun AppDescriptionInput(
    description: String,
    onDescriptionChange: (String) -> Unit,
    onGenerate: () -> Unit,
    enabled: Boolean
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "Describe Your App",
                style = MaterialTheme.typography.titleLarge
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Describe the Android app you want to build. Be detailed about features, screens, and functionality.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = description,
                onValueChange = onDescriptionChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp),
                placeholder = {
                    Text("Example: I want a todo list app with categories, due dates, and reminders. It should have a clean Material 3 design with dark mode support...")
                },
                enabled = enabled
            )

            Spacer(modifier = Modifier.height(16.dp))

            Button(
                onClick = onGenerate,
                modifier = Modifier.fillMaxWidth(),
                enabled = enabled && description.isNotBlank()
            ) {
                Icon(Icons.Default.AutoAwesome, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Generate App")
            }
        }
    }
}

@Composable
fun BuildProgressCard(
    progress: Int,
    message: String
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            CircularProgressIndicator(
                progress = progress / 100f,
                modifier = Modifier.size(80.dp),
                strokeWidth = 6.dp
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "$progress%",
                style = MaterialTheme.typography.headlineMedium
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Spacer(modifier = Modifier.height(16.dp))

            LinearProgressIndicator(
                progress = progress / 100f,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun AppReadyCard(
    projectName: String,
    apkUrl: String?,
    aabUrl: String?,
    onInstall: (String) -> Unit,
    onDownloadAab: (String) -> Unit,
    onNewApp: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.primary
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                text = "Your App is Ready!",
                style = MaterialTheme.typography.headlineMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = projectName,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onPrimaryContainer
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Install button
            if (apkUrl != null) {
                Button(
                    onClick = { onInstall(apkUrl) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.PhoneAndroid, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Install on Device")
                }

                Spacer(modifier = Modifier.height(12.dp))
            }

            // Download AAB button
            if (aabUrl != null) {
                OutlinedButton(
                    onClick = { onDownloadAab(aabUrl) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Download, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Download AAB for Play Console")
                }

                Spacer(modifier = Modifier.height(12.dp))
            }

            // Create new app button
            TextButton(
                onClick = onNewApp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Create Another App")
            }
        }
    }
}
