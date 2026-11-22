plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "vn.siso.os"
    compileSdk = 34
    defaultConfig {
        applicationId = "vn.siso.os"
        minSdk = 26
        targetSdk = 34
        versionCode = 12
        versionName = "1.2"
    }
    buildTypes { release { isMinifyEnabled = false } }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
dependencies {
    implementation("androidx.recyclerview:recyclerview:1.3.2")
    implementation("androidx.core:core:1.12.0")
}
