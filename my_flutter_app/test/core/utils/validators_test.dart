import 'package:flutter_test/flutter_test.dart';
import 'package:my_flutter_app/src/core/utils/validators.dart';

void main() {
  group('Validators', () {
    test('validateEmail returns null for valid email', () {
      expect(Validators.validateEmail('test@example.com'), null);
      expect(Validators.validateEmail('test.name@example.co.uk'), null);
      expect(Validators.validateEmail('user+tag@gmail.com'), null);
      expect(Validators.validateEmail('user-name@domain.com'), null);
      expect(Validators.validateEmail('user_name@domain.com'), null);
      expect(Validators.validateEmail('user@sub.domain.com'), null);
      expect(Validators.validateEmail('user@my-company.com'), null);
    });

    test('validateEmail returns error for invalid email', () {
      expect(Validators.validateEmail('invalid-email'), 'Enter a valid email address');
      expect(Validators.validateEmail('@example.com'), 'Enter a valid email address');
      expect(Validators.validateEmail('user@'), 'Enter a valid email address');
      expect(Validators.validateEmail('user@.com'), 'Enter a valid email address');
      expect(Validators.validateEmail('user@domain.'), 'Enter a valid email address');
      expect(Validators.validateEmail('user@domain.com<script>'), 'Enter a valid email address');
      expect(Validators.validateEmail(''), 'Email is required');
      expect(Validators.validateEmail(null), 'Email is required');
    });

    test('validatePassword returns null for valid password', () {
      expect(Validators.validatePassword('Password123'), null);
      expect(Validators.validatePassword('Pass123!@#'), null); // With special chars
    });

    test('validatePassword returns error for short password', () {
      expect(Validators.validatePassword('Pass1'), 'Password must be at least 8 characters');
    });

    test('validatePassword returns error for simple password', () {
      expect(Validators.validatePassword('password'), 'Password must contain at least one letter and one number');
      expect(Validators.validatePassword('12345678'), 'Password must contain at least one letter and one number');
      expect(Validators.validatePassword('!!!!!!!!'), 'Password must contain at least one letter and one number');
    });

    test('validateUsername returns null for valid username', () {
      expect(Validators.validateUsername('user'), null);
    });

    test('validateUsername returns error for short username', () {
      expect(Validators.validateUsername('us'), 'Username must be at least 3 characters');
      expect(Validators.validateUsername(''), 'Username is required');
      expect(Validators.validateUsername(null), 'Username is required');
    });
  });
}
