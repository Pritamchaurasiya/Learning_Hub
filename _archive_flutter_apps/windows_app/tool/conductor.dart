// ignore_for_file: avoid_print
import 'dart:io';

/// Learning Hub Conductor
/// The central automation script for God-Tier development.
/// Usage: dart tool/conductor.dart command

void main(List<String> args) async {
  print('\n🚀 LEARNING HUB CONDUCTOR (GOD MODE) 🚀\n');

  if (args.isEmpty) {
    _printUsage();
    return;
  }

  final command = args[0];

  switch (command) {
    case 'analyze':
      await _runAnalyze();
      break;
    case 'test':
      await _runTest();
      break;
    case 'run':
      await _runWeb();
      break;
    case 'windows':
      await _runWindows();
      break;
    case 'fix':
      await _runFix();
      break;
    case 'check':
      await _runFullCheck();
      break;
    default:
      print('❌ Unknown command: $command');
      _printUsage();
  }
}

void _printUsage() {
  print('Available commands:');
  print('  analyze  - Run static analysis');
  print('  test     - Run unit tests');
  print('  run      - Run web application');
  print('  windows  - Run Windows desktop app');
  print('  fix      - Apply automatic fixes');
  print('  check    - Run analysis and tests');
}

Future<void> _runAnalyze() async {
  print('🔍 Running Static Analysis...');
  final result = await Process.run('flutter', ['analyze']);
  if (result.exitCode == 0) {
    print('✅ Analysis passed! No issues found.');
  } else {
    print('⚠️ Analysis failed with ${result.exitCode} issues:');
    print(result.stdout);
  }
  print('----------------------------------------');
}

Future<void> _runTest() async {
  print('🧪 Running Tests...');
  final result = await Process.start('flutter', ['test']);
  await stdout.addStream(result.stdout);
  await stderr.addStream(result.stderr);
  final exitCode = await result.exitCode;
  if (exitCode == 0) {
    print('\n✅ All tests passed!');
  } else {
    print('\n❌ Tests failed.');
  }
  print('----------------------------------------');
}

Future<void> _runWeb() async {
  print('🌐 Launching Web Application...');
  // Reverting to Process.run to avoid stream/isolate complexity in this environment
  final result = await Process.run('flutter', ['run', '-d', 'chrome']);
  stdout.write(result.stdout);
  stderr.write(result.stderr);
}

Future<void> _runWindows() async {
  print('🖥️ Launching Windows Desktop Application...');
  print('⚠️ Note: Requires Developer Mode enabled for symlink support.');
  final result = await Process.run('flutter', ['run', '-d', 'windows']);
  stdout.write(result.stdout);
  stderr.write(result.stderr);
  if (result.exitCode != 0) {
    print('❌ Windows launch failed. Check if Developer Mode is enabled.');
  }
}

Future<void> _runFix() async {
  print('🔧 Applying Fixes...');
  final result = await Process.run('dart', ['fix', '--apply']);
  print(result.stdout);
  print('✅ Fixes applied.');
}

Future<void> _runFullCheck() async {
  await _runAnalyze();
  await _runTest();
}
