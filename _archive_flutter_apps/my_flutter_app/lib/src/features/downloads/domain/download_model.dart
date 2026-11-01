/// Domain model for Download item
class DownloadItem {
  DownloadItem({
    required this.id,
    required this.contentType,
    required this.contentId,
    required this.title,
    this.fileUrl,
    required this.fileSize,
    required this.downloadedAt,
    this.expiresAt,
    required this.isExpired,
  });

  factory DownloadItem.fromJson(Map<String, dynamic> json) {
    return DownloadItem(
      id: json['id'] as int,
      contentType: json['content_type'] as String? ?? 'document',
      contentId: json['content_id'] as int? ?? 0,
      title: json['title'] as String? ?? '',
      fileUrl: json['file_url'] as String?,
      fileSize: json['file_size'] as int? ?? 0,
      downloadedAt: DateTime.parse(json['downloaded_at'] as String),
      expiresAt: json['expires_at'] != null
          ? DateTime.parse(json['expires_at'] as String)
          : null,
      isExpired: json['is_expired'] as bool? ?? false,
    );
  }
  final int id;
  final String contentType;
  final int contentId;
  final String title;
  final String? fileUrl;
  final int fileSize;
  final DateTime downloadedAt;
  final DateTime? expiresAt;
  final bool isExpired;

  String get fileSizeFormatted {
    if (fileSize < 1024) {
      return '$fileSize B';
    }
    if (fileSize < 1024 * 1024) {
      return '${(fileSize / 1024).toStringAsFixed(1)} KB';
    }
    return '${(fileSize / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  String get icon {
    switch (contentType) {
      case 'video':
        return '🎬';
      case 'document':
        return '📄';
      case 'quiz':
        return '📝';
      case 'certificate':
        return '🏆';
      default:
        return '📁';
    }
  }
}

class DownloadStats {
  DownloadStats({
    required this.totalDownloads,
    required this.totalSizeBytes,
    required this.totalSizeMb,
  });

  factory DownloadStats.fromJson(Map<String, dynamic> json) {
    return DownloadStats(
      totalDownloads: json['total_downloads'] as int? ?? 0,
      totalSizeBytes: json['total_size_bytes'] as int? ?? 0,
      totalSizeMb: (json['total_size_mb'] as num?)?.toDouble() ?? 0.0,
    );
  }
  final int totalDownloads;
  final int totalSizeBytes;
  final double totalSizeMb;
}
