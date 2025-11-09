package com.nl2build.app.data

import com.nl2build.app.models.AppProject
import com.nl2build.app.models.BuildStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID

class ProjectRepository {

    private val _projects = MutableStateFlow<List<AppProject>>(emptyList())
    val projects: Flow<List<AppProject>> = _projects.asStateFlow()

    fun createProject(name: String, description: String): AppProject {
        val project = AppProject(
            id = UUID.randomUUID().toString(),
            name = name,
            description = description,
            status = BuildStatus.PENDING
        )
        _projects.update { current -> current + project }
        return project
    }

    fun updateProject(project: AppProject) {
        _projects.update { current ->
            current.map { if (it.id == project.id) project else it }
        }
    }

    fun getProject(id: String): AppProject? {
        return _projects.value.find { it.id == id }
    }

    fun deleteProject(id: String) {
        _projects.update { current ->
            current.filter { it.id != id }
        }
    }

    fun updateProjectStatus(id: String, status: BuildStatus, errorMessage: String? = null) {
        _projects.update { current ->
            current.map { project ->
                if (project.id == id) {
                    project.copy(
                        status = status,
                        errorMessage = errorMessage,
                        updatedAt = System.currentTimeMillis()
                    )
                } else {
                    project
                }
            }
        }
    }

    fun setProjectUrls(id: String, apkUrl: String?, aabUrl: String?) {
        _projects.update { current ->
            current.map { project ->
                if (project.id == id) {
                    project.copy(
                        apkUrl = apkUrl,
                        aabUrl = aabUrl,
                        updatedAt = System.currentTimeMillis()
                    )
                } else {
                    project
                }
            }
        }
    }
}
