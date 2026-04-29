# 📱 MOBILE SECURITY: DEEP DIVE (iOS & Android)

> [!WARNING]
> Mobile apps are untrusted clients running in hostile environments. Never trust the client.

---

## 1. THREAT MODEL

- **Reverse Engineering**: Attackers will decompile your APK/IPA.
- **Insecure Data Storage**: Storing tokens/PII in SharedPreferences/UserDefaults.
- **Network Interception**: Man-in-the-Middle (MitM) attacks.
- **Leaked Secrets**: API keys hardcoded in the binary.

---

## 2. ANDROID HARDENING

### 2.1 Code Obfuscation (R8/ProGuard)

Shrinks and obfuscates code to make reverse engineering harder.

```groovy
// build.gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 2.2 Secure Storage

Use **EncryptedSharedPreferences** (Jetpack Security). It uses the Master Key capability of the Android Keystore.

### 2.3 Network Security Config

Prevent cleartext traffic and facilitate Certificate Pinning.

```xml
<!-- res/xml/network_security_config.xml -->
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.yourdomain.com</domain>
        <pin-set>
            <pin digest="SHA-256">BASE64_HASH_OF_PUBLIC_KEY</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

---

## 3. iOS HARDENING (Swift)

### 3.1 Keychain Services

Never store sensitive data in `UserDefaults`. Use the **Keychain**.
Libraries like `SwiftKeychainWrapper` or `Valet` make this easy.

### 3.2 App Transport Security (ATS)

Enforces secure connections. Ensure `NSAllowsArbitraryLoads` is `NO` in Info.plist.

### 3.3 Jailbreak Detection

Check for Cydia, suspicious file paths, or write access to system directories. _Note: Cat and mouse game._

---

## 4. FLUTTER SECURITY SPECIFICS

### 4.1 Secure Storage

Use `flutter_secure_storage` package.

- **Android**: Uses Keystore/EncryptedSharedPreferences.
- **iOS**: Uses Keychain.

```dart
final storage = new FlutterSecureStorage();
await storage.write(key: 'jwt_token', value: token);
```

### 4.2 Removing Debug Symbols

Ensure you build with `--release`. Debug builds enable the Dart VM service, allowing code injection.

### 4.3 SSL Pinning

Use `http_certificate_pinning` or configure `Dio` with a trusted certificate.

```dart
dio.httpClientAdapter = IOHttpClientAdapter(
  createHttpClient: () {
    final client = HttpClient();
    client.badCertificateCallback = (cert, host, port) => false; // Strict
    return client;
  }
);
```

---

## 5. API SECURITY (The Backend's Role)

- **Certificate Pinning**: To prevent MitM.
- **App Attestation**: Use **Google Play Integrity API** and **Apple App Attest** to verify requests come from your genuine, unmodified app, not a script.
- **Rate Limiting**: Per device ID / IP.

---

## 6. OWASP MOBILE TOP 10

1.  Improper Platform Usage.
2.  Insecure Data Storage.
3.  Insecure Communication.
4.  Insecure Authentication.
5.  Insufficient Cryptography.
