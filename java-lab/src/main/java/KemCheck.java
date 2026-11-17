import java.security.*;
import java.util.Arrays;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.security.auth.DestroyFailedException;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jcajce.SecretKeyWithEncapsulation;
import org.bouncycastle.jcajce.spec.KEMExtractSpec;
import org.bouncycastle.jcajce.spec.KEMGenerateSpec;
import org.bouncycastle.jcajce.spec.MLKEMParameterSpec;

public class KemCheck {
    private static final int ML_KEM_768_CT = 1088;   // FIPS 203

    public static void main(String[] args) {
        Security.addProvider(new BouncyCastleProvider());
        int status = 0;
        byte[] a = null, b = null;
        SecretKey sent = null, recv = null;
        try {
            SecureRandom rng = new SecureRandom();
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");
            kpg.initialize(MLKEMParameterSpec.ml_kem_768, rng);
            KeyPair kp = kpg.generateKeyPair();

            KeyGenerator enc = KeyGenerator.getInstance("ML-KEM", "BC");
            enc.init(new KEMGenerateSpec(kp.getPublic(), "AES", 256), rng);
            SecretKeyWithEncapsulation s = (SecretKeyWithEncapsulation) enc.generateKey();
            sent = s;
            byte[] ct = s.getEncapsulation();

            KeyGenerator dec = KeyGenerator.getInstance("ML-KEM", "BC");
            dec.init(new KEMExtractSpec(kp.getPrivate(), ct, "AES", 256));
            recv = dec.generateKey();

            a = sent.getEncoded();
            b = recv.getEncoded();
            System.out.println("providerIsBC=" + "BC".equals(kpg.getProvider().getName()));
            System.out.println("ctLenIs1088=" + (ct.length == ML_KEM_768_CT));
            System.out.println("secretsMatch=" + MessageDigest.isEqual(a, b));
        } catch (GeneralSecurityException e) {
            System.err.println("KEM failure: " + e.getClass().getSimpleName());
            status = 1;
        } finally {
            wipe(a);
            wipe(b);
            destroyQuietly(sent);
            destroyQuietly(recv);
        }
        if (status == 0) {
            System.out.println("cleanedUp=" + (isZero(a) && isZero(b)));
        }
        System.exit(status);
    }

    static void wipe(byte[] x) { if (x != null) Arrays.fill(x, (byte) 0); }

    static boolean isZero(byte[] x) {
        if (x == null) return false;
        for (byte v : x) if (v != 0) return false;
        return true;
    }

    static void destroyQuietly(SecretKey k) {
        if (k == null) return;
        try { k.destroy(); }
        catch (DestroyFailedException e) { /* not destroyable; own copies already wiped */ }
    }
}