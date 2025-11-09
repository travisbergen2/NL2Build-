package com.nl2build.app.models

import kotlinx.serialization.Serializable

@Serializable
data class AppProject(
    val id: String,
    val name: String,
    val description: String,
    val specification: AppSpecification? = null,
    val status: BuildStatus = BuildStatus.PENDING,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val apkUrl: String? = null,
    val aabUrl: String? = null,
    val errorMessage: String? = null
)

@Serializable
data class AppSpecification(
    val appName: String,
    val packageName: String,
    val description: String,
    val features: List<String>,
    val screens: List<Screen>,
    val theme: AppTheme,
    val minSdkVersion: Int = 26,
    val targetSdkVersion: Int = 34
)

@Serializable
data class Screen(
    val name: String,
    val type: ScreenType,
    val components: List<UIComponent>,
    val navigation: List<String> = emptyList()
)

@Serializable
enum class ScreenType {
    MAIN, DETAIL, FORM, LIST, SETTINGS, SPLASH, LOGIN, DASHBOARD
}

@Serializable
data class UIComponent(
    val type: ComponentType,
    val label: String,
    val properties: Map<String, String> = emptyMap()
)

@Serializable
enum class ComponentType {
    TEXT, BUTTON, IMAGE, INPUT, LIST, CARD, CHECKBOX, RADIO, DROPDOWN, SWITCH
}

@Serializable
data class AppTheme(
    val primaryColor: String = "#6750A4",
    val secondaryColor: String = "#625B71",
    val useDarkMode: Boolean = false,
    val useMaterial3: Boolean = true
)

@Serializable
enum class BuildStatus {
    PENDING,
    ANALYZING,      // Layer 1 AI processing
    GENERATING,     // Layer 2 AI creating project
    BUILDING,       // CI/CD building APK/AAB
    SIGNING,        // Signing the app
    READY,          // Complete and ready to install
    FAILED,         // Something went wrong
    INSTALLING      // Being installed on device
}
