import java.security.*;
import java.util.Arrays;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider;
import org.bouncycastle.jcajce.SecretKeyWithEncapsulation;
import org.bouncycastle.jcajce.interfaces.MLKEMKey;
import org.bouncycastle.jcajce.spec.KEMExtractSpec;
import org.bouncycastle.jcajce.spec.KEMGenerateSpec;
import org.bouncycastle.jcajce.spec.MLKEMParameterSpec;

public final class PinnedKem {
    private static final String PROVIDER = "BC";
    private static final String SET = "ML-KEM-768";   // confirm exact string on the lab VM
    private static final int CT_LEN = 1088;            // FIPS 203, ML-KEM-768 ciphertext
    private static final SecureRandom RNG = new SecureRandom();

    public static KeyPair generate() throws GeneralSecurityException {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", PROVIDER);
        kpg.initialize(MLKEMParameterSpec.ml_kem_768, RNG);
        KeyPair kp = kpg.generateKeyPair();
        System.out.println("provider=" + kpg.getProvider().getName());
        requireBcMlKem768(kp.getPublic());
        requireBcMlKem768(kp.getPrivate());
        return kp;
    }

    public static SecretKeyWithEncapsulation encapsulate(PublicKey ek) throws GeneralSecurityException {
        requireBcMlKem768(ek);                                   // guard runs before any BC call
        KeyGenerator enc = KeyGenerator.getInstance("ML-KEM", PROVIDER);
        enc.init(new KEMGenerateSpec(ek, "AES", 256), RNG);
        SecretKeyWithEncapsulation s = (SecretKeyWithEncapsulation) enc.generateKey();
        if (s.getEncapsulation().length != CT_LEN) {
            throw new IllegalStateException("ciphertext " + s.getEncapsulation().length + " bytes, expected " + CT_LEN);
        }
        return s;
    }

    public static SecretKey decapsulate(PrivateKey dk, byte[] ct) throws GeneralSecurityException {
        requireBcMlKem768(dk);
        if (ct == null || ct.length != CT_LEN) {
            throw new IllegalArgumentException("ciphertext must be " + CT_LEN + " bytes");
        }
        KeyGenerator dec = KeyGenerator.getInstance("ML-KEM", PROVIDER);
        dec.init(new KEMExtractSpec(dk, ct, "AES", 256));
        return dec.generateKey();
    }

    static void requireBcMlKem768(Key k) {
        if (!(k instanceof MLKEMKey mk)) {
            throw new IllegalArgumentException(
                "not a BC ML-KEM key: " + (k == null ? "null" : k.getClass().getName()));
        }
        String set = mk.getParameterSpec().getName();
        if (!SET.equals(set)) {
            throw new IllegalArgumentException("wrong parameter set: " + set);
        }
    }

    public static void main(String[] args) {
        Security.addProvider(new BouncyCastleProvider());
        try {
            KeyPair kp = generate();
            SecretKeyWithEncapsulation s = encapsulate(kp.getPublic());
            SecretKey r = decapsulate(kp.getPrivate(), s.getEncapsulation());
            byte[] a = s.getEncoded(), b = r.getEncoded();
            System.out.println("roundTripOk=" + MessageDigest.isEqual(a, b));
            Arrays.fill(a, (byte) 0);
            Arrays.fill(b, (byte) 0);

            Security.insertProviderAt(new BouncyCastlePQCProvider(), 1);
            boolean rejected = false;
            try {
                KeyPairGenerator foreign = KeyPairGenerator.getInstance("ML-KEM-768", "BCPQC");
                KeyPair fkp = foreign.generateKeyPair();
                System.out.println("provider=" + foreign.getProvider().getName());
                encapsulate(fkp.getPublic());
            } catch (IllegalArgumentException e) {
                rejected = true;
                System.out.println("guardMessage=" + e.getMessage());
            } catch (NoSuchAlgorithmException e) {
                System.out.println("foreignKeyTest=skipped (BCPQC does not offer ML-KEM-768 in this version)");
            } finally {
                Security.removeProvider("BCPQC");
            }
            System.out.println("foreignKeyRejected=" + rejected);
        } catch (GeneralSecurityException e) {
            System.err.println("KEM failure: " + e.getClass().getSimpleName());
            System.exit(1);
        }
    }
}