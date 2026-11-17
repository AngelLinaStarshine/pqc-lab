import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import javax.security.auth.DestroyFailedException;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider;
import org.bouncycastle.jcajce.SecretKeyWithEncapsulation;
import org.bouncycastle.jcajce.interfaces.MLKEMKey;
import org.bouncycastle.jcajce.spec.*;

/** Answers every "confirm on the lab VM" question in the PQC Lab lessons, on JDK 21 + BC 1.79. */
public class Probe {
    static void p(String k, Object v) { System.out.println(k + " = " + v); }
    static String ex(Throwable t) { return t.getClass().getName() + ": " + t.getMessage(); }

    static SecretKeyWithEncapsulation enc(PublicKey pk, int bits, SecureRandom r) throws Exception {
        KeyGenerator g = KeyGenerator.getInstance("ML-KEM", "BC");
        g.init(new KEMGenerateSpec(pk, "AES", bits), r);
        return (SecretKeyWithEncapsulation) g.generateKey();
    }
    static SecretKey dec(PrivateKey sk, byte[] ct, int bits) throws Exception {
        KeyGenerator g = KeyGenerator.getInstance("ML-KEM", "BC");
        g.init(new KEMExtractSpec(sk, ct, "AES", bits));
        return g.generateKey();
    }

    public static void main(String[] a) throws Exception {
        p("java.version", System.getProperty("java.version"));
        // 0. Before registering BC: unpinned and pinned lookups on plain JDK 21
        try { KeyPairGenerator.getInstance("ML-KEM"); p("jdk21.unpinned.noBC", "returned a provider (unexpected)"); }
        catch (Exception e) { p("jdk21.unpinned.noBC", ex(e)); }
        try { KeyPairGenerator.getInstance("ML-KEM", "BC"); }
        catch (Exception e) { p("pinned.noBC", ex(e)); }

        Security.addProvider(new BouncyCastleProvider());
        p("bc.version", Security.getProvider("BC").getVersionStr());
        p("unpinned.withBC.answeredBy", KeyPairGenerator.getInstance("ML-KEM").getProvider().getName());

        SecureRandom rng = new SecureRandom();
        for (MLKEMParameterSpec s : new MLKEMParameterSpec[]{MLKEMParameterSpec.ml_kem_512, MLKEMParameterSpec.ml_kem_768, MLKEMParameterSpec.ml_kem_1024}) {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");
            kpg.initialize(s, rng);
            KeyPair kp = kpg.generateKeyPair();
            SecretKeyWithEncapsulation e = enc(kp.getPublic(), 256, rng);
            SecretKey d = dec(kp.getPrivate(), e.getEncapsulation(), 256);
            String n = s.getName();
            p(n + ".spec.getName", n);
            p(n + ".key.getParameterSpec.getName", ((MLKEMKey) kp.getPublic()).getParameterSpec().getName());
            p(n + ".pub.getAlgorithm", kp.getPublic().getAlgorithm());
            p(n + ".pub.class", kp.getPublic().getClass().getName());
            p(n + ".pub.getEncoded.length(DER)", kp.getPublic().getEncoded().length);
            p(n + ".priv.getEncoded.length", kp.getPrivate().getEncoded().length);
            p(n + ".ct.length", e.getEncapsulation().length);
            p(n + ".derivedKey.length", e.getEncoded().length);
            p(n + ".match", MessageDigest.isEqual(e.getEncoded(), d.getEncoded()));
        }
        // Default set when initialize is skipped
        try { KeyPair kp = KeyPairGenerator.getInstance("ML-KEM", "BC").generateKeyPair();
              p("default.noInitialize.set", ((MLKEMKey) kp.getPublic()).getParameterSpec().getName()); }
        catch (Exception e) { p("default.noInitialize", ex(e)); }
        // Name-specific lookup
        try { KeyPair kp = KeyPairGenerator.getInstance("ML-KEM-768", "BC").generateKeyPair();
              p("getInstance(ML-KEM-768,BC).set", ((MLKEMKey) kp.getPublic()).getParameterSpec().getName()); }
        catch (Exception e) { p("getInstance(ML-KEM-768,BC)", ex(e)); }

        KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");
        kpg.initialize(MLKEMParameterSpec.ml_kem_768, rng);
        KeyPair kp = kpg.generateKeyPair();
        // EC spec passed to ML-KEM
        try { KeyPairGenerator g = KeyPairGenerator.getInstance("ML-KEM", "BC"); g.initialize(new ECGenParameterSpec("secp256r1")); p("ecSpec", "accepted (unexpected)"); }
        catch (Exception e) { p("ecSpec.exception", ex(e)); }
        // KDF mismatch
        SecretKeyWithEncapsulation s1 = enc(kp.getPublic(), 256, rng);
        try { SecretKey r128 = dec(kp.getPrivate(), s1.getEncapsulation(), 128);
              p("kdf.256vs128.match", MessageDigest.isEqual(s1.getEncoded(), r128.getEncoded()) + " (lengths " + s1.getEncoded().length + "/" + r128.getEncoded().length + ")"); }
        catch (Exception e) { p("kdf.256vs128", ex(e)); }
        // Tampered ciphertext
        byte[] t = s1.getEncapsulation().clone(); t[0] ^= 1;
        try { SecretKey bad = dec(kp.getPrivate(), t, 256); p("tamper.exception", "none"); p("tamper.match", MessageDigest.isEqual(s1.getEncoded(), bad.getEncoded()));
              // AEAD catches it
              byte[] iv = new byte[12]; rng.nextBytes(iv);
              Cipher c = Cipher.getInstance("AES/GCM/NoPadding"); c.init(Cipher.ENCRYPT_MODE, s1, new GCMParameterSpec(128, iv));
              byte[] msg = c.doFinal("hello Bob".getBytes());
              Cipher d2 = Cipher.getInstance("AES/GCM/NoPadding"); d2.init(Cipher.DECRYPT_MODE, bad, new GCMParameterSpec(128, iv));
              try { d2.doFinal(msg); p("tamper.aead", "decrypted (unexpected)"); } catch (Exception e) { p("tamper.aead", ex(e)); } }
        catch (Exception e) { p("tamper.exception", ex(e)); }
        // Wrong-length ciphertext
        try { dec(kp.getPrivate(), Arrays.copyOf(s1.getEncapsulation(), 1087), 256); p("wrongLength.exception", "none"); }
        catch (Exception e) { p("wrongLength.exception", ex(e)); }
        // Public key where private needed
        try { KeyGenerator g = KeyGenerator.getInstance("ML-KEM", "BC"); g.init(new KEMExtractSpec((PrivateKey)(Object)null == null ? null : null, s1.getEncapsulation(), "AES", 256)); }
        catch (Exception e) { p("nullKey.extract", ex(e)); }
        // Seeded SHA1PRNG determinism (SUN provider)
        String[] h = new String[2];
        for (int i = 0; i < 2; i++) {
            SecureRandom sr = SecureRandom.getInstance("SHA1PRNG"); sr.setSeed(42L);
            KeyPairGenerator g = KeyPairGenerator.getInstance("ML-KEM", "BC"); g.initialize(MLKEMParameterSpec.ml_kem_768, sr);
            KeyPair k2 = g.generateKeyPair();
            SecretKeyWithEncapsulation e2 = enc(k2.getPublic(), 256, sr);
            h[i] = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(e2.getEncapsulation())).substring(0, 16)
                 + "/pk:" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(k2.getPublic().getEncoded())).substring(0, 8);
        }
        p("seededSHA1PRNG.run1", h[0]); p("seededSHA1PRNG.run2", h[1]); p("seededSHA1PRNG.identical", h[0].equals(h[1]));
        SecureRandom f = new SecureRandom();
        p("fresh.twoEncaps.differ", !Arrays.equals(enc(kp.getPublic(), 256, f).getEncapsulation(), enc(kp.getPublic(), 256, f).getEncapsulation()));
        // destroy()
        try { s1.destroy(); p("SecretKeyWithEncapsulation.destroy", "ok, isDestroyed=" + s1.isDestroyed()); }
        catch (DestroyFailedException e) { p("SecretKeyWithEncapsulation.destroy", ex(e)); }
        SecretKey r = dec(kp.getPrivate(), enc(kp.getPublic(), 256, rng).getEncapsulation(), 256);
        try { r.destroy(); p("extracted.destroy", "ok"); } catch (DestroyFailedException e) { p("extracted.destroy", ex(e) + " class=" + r.getClass().getName()); }
        // low-level raw public key length
        try {
            Class<?> c = Class.forName("org.bouncycastle.pqc.crypto.mlkem.MLKEMPublicKeyParameters");
            Object params = org.bouncycastle.pqc.crypto.util.PublicKeyFactory.createKey(kp.getPublic().getEncoded());
            p("lowLevel.pub.getEncoded.length", c.getMethod("getEncoded").invoke(params) instanceof byte[] b ? b.length : -1);
        } catch (Throwable e) { p("lowLevel.pub", ex(e)); }

        // BCPQC behaviour in 1.79
        Security.insertProviderAt(new BouncyCastlePQCProvider(), 1);
        p("bcpqc.version", Security.getProvider("BCPQC").getVersionStr());
        for (String name : new String[]{"ML-KEM", "ML-KEM-768", "Kyber", "KYBER768"}) {
            try { KeyPairGenerator g = KeyPairGenerator.getInstance(name, "BCPQC"); KeyPair k = g.generateKeyPair();
                  p("bcpqc." + name, "class=" + k.getPublic().getClass().getName() + " alg=" + k.getPublic().getAlgorithm() + " instanceofMLKEMKey=" + (k.getPublic() instanceof MLKEMKey));
                  try { enc(k.getPublic(), 256, rng); p("bcpqc." + name + ".usedWithBC", "accepted"); } catch (Exception e) { p("bcpqc." + name + ".usedWithBC", ex(e)); } }
            catch (Exception e) { p("bcpqc." + name, ex(e)); }
        }
        try { p("unpinned.BCPQCfirst.answeredBy", KeyPairGenerator.getInstance("ML-KEM").getProvider().getName()); }
        catch (Exception e) { p("unpinned.BCPQCfirst", ex(e)); }
        try { Class.forName("org.bouncycastle.pqc.jcajce.spec.KyberParameterSpec"); p("KyberParameterSpec.exists", true); }
        catch (Throwable e) { p("KyberParameterSpec.exists", false); }
        Security.removeProvider("BCPQC");
    }
}
