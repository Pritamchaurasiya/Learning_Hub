class File {
  File();
  Future<bool> exists() async => false;
  Future<void> delete() async {}
  String get path => '';
}
