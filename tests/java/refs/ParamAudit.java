import java.security.*;
import java.util.Arrays;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jcajce.SecretKeyWithEncapsulation;
import org.bouncycastle.jcajce.spec.KEMExtractSpec;
import org.bouncycastle.jcajce.spec.KEMGenerateSpec;
import org.bouncycastle.jcajce.spec.MLKEMParameterSpec;

public class ParamAudit {
    // FIPS 203: parameter set, NIST security category, ciphertext length in bytes
    record Row(String name, MLKEMParameterSpec spec, int category, int ctLen) {}
    static final Row[] FIPS203 = {
        new Row("ML-KEM-512",  MLKEMParameterSpec.ml_kem_512,  1, 768),
        new Row("ML-KEM-768",  MLKEMParameterSpec.ml_kem_768,  3, 1088),
        new Row("ML-KEM-1024", MLKEMParameterSpec.ml_kem_1024, 5, 1568),
    };
    static final Row REQUIRED = FIPS203[1];
    static final SecureRandom RNG = new SecureRandom();

    public static void main(String[] args) {
        Security.addProvider(new BouncyCastleProvider());
        int minCategory = args.length > 0 ? Integer.parseInt(args[0]) : 3;
        try {
            System.out.println("set,category,ctLen,expectedCtLen,ctOk,secretsMatch");
            for (Row r : FIPS203) {
                KeyPair kp = keyPair(r.spec());
                SecretKeyWithEncapsulation s = encapsulate(kp.getPublic());
                boolean match = agrees(s, kp.getPrivate(), s.getEncapsulation());
                int len = s.getEncapsulation().length;
                System.out.println(r.name() + "," + r.category() + "," + len + "," + r.ctLen()
                        + "," + (len == r.ctLen()) + "," + match);
            }
            if (REQUIRED.category() < minCategory) {
                throw new IllegalStateException(REQUIRED.name() + " is category " + REQUIRED.category()
                        + ", policy requires " + minCategory);
            }
            KeyPair kp = keyPair(REQUIRED.spec());
            SecretKeyWithEncapsulation s1 = encapsulate(kp.getPublic());
            byte[] ct = s1.getEncapsulation();
            if (ct.length != REQUIRED.ctLen()) {
                throw new IllegalStateException("ciphertext " + ct.length + " bytes, expected " + REQUIRED.ctLen());
            }
            if (!agrees(s1, kp.getPrivate(), ct)) {
                throw new IllegalStateException("round-trip keys disagree");
            }
            SecretKeyWithEncapsulation s2 = encapsulate(kp.getPublic());
            System.out.println("freshRandomness=" + !Arrays.equals(ct, s2.getEncapsulation()));

            byte[] tampered = ct.clone();
            tampered[0] ^= 0x01;
            boolean threw = false, detected = false;
            try {
                detected = !agrees(s1, kp.getPrivate(), tampered);
            } catch (GeneralSecurityException e) {
                threw = true;
            }
            System.out.println("tamperDetectedByCompare=" + detected);
            System.out.println("tamperThrew=" + threw);
        } catch (GeneralSecurityException e) {
            System.err.println("KEM failure: " + e.getClass().getSimpleName());
            System.exit(1);
        } catch (IllegalStateException e) {
            System.err.println("Check failed: " + e.getMessage());
            System.exit(2);
        }
    }

    static KeyPair keyPair(MLKEMParameterSpec spec) throws GeneralSecurityException {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");
        kpg.initialize(spec, RNG);
        return kpg.generateKeyPair();
    }

    static SecretKeyWithEncapsulation encapsulate(PublicKey ek) throws GeneralSecurityException {
        KeyGenerator enc = KeyGenerator.getInstance("ML-KEM", "BC");
        enc.init(new KEMGenerateSpec(ek, "AES", 256), RNG);
        return (SecretKeyWithEncapsulation) enc.generateKey();
    }

    // Test-only comparison: decapsulate ct and compare with the sender's key, wiping both copies.
    static boolean agrees(SecretKey sent, PrivateKey dk, byte[] ct) throws GeneralSecurityException {
        KeyGenerator dec = KeyGenerator.getInstance("ML-KEM", "BC");
        dec.init(new KEMExtractSpec(dk, ct, "AES", 256));
        byte[] a = sent.getEncoded();
        byte[] b = dec.generateKey().getEncoded();
        try {
            return MessageDigest.isEqual(a, b);
        } finally {
            Arrays.fill(a, (byte) 0);
            Arrays.fill(b, (byte) 0);
        }
    }
}