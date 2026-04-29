#Flutter Wrapper
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.**  { *; }
-keep class io.flutter.util.**  { *; }
-keep class io.flutter.view.**  { *; }
-keep class io.flutter.**  { *; }
-keep class io.flutter.plugins.**  { *; }
-dontwarn io.flutter.embedding.**

# Generic Flutter
-keepnames class * extends io.flutter.plugin.common.PluginRegistry$Registrar

# Keep custom Application class
-keep class com.example.my_flutter_app.** { *; }
