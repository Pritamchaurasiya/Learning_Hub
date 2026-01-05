class User {
  const User({
    required this.id,
    required this.email,
    required this.username,
    required this.role,
    this.isActive = true,
    this.displayName,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      username: json['username'] as String,
      role: json['role'] as String,
      isActive: json['is_active'] as bool? ?? true,
      displayName: json['display_name'] as String?,
    );
  }
  final String id;
  final String email;
  final String username;
  final String role;
  final bool isActive;
  final String? displayName;

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'username': username,
      'role': role,
      'is_active': isActive,
      'display_name': displayName,
    };
  }
}
