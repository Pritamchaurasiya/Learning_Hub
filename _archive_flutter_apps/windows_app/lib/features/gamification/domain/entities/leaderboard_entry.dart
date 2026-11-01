import 'package:equatable/equatable.dart';

class LeaderboardEntry extends Equatable {
  final String userId;
  final String displayName;
  final String avatarUrl;
  final int xp;
  final int rank;
  final bool isCurrentUser;

  const LeaderboardEntry({
    required this.userId,
    required this.displayName,
    required this.avatarUrl,
    required this.xp,
    required this.rank,
    this.isCurrentUser = false,
  });

  @override
  List<Object?> get props =>
      [userId, displayName, avatarUrl, xp, rank, isCurrentUser];
}
