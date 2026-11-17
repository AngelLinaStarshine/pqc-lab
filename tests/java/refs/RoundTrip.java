import java.security.*;
import javax.crypto.KeyGenerator;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.jcajce.SecretKeyWithEncapsulation;
import org.bouncycastle.jcajce.spec.KEMExtractSpec;
import org.bouncycastle.jcajce.spec.KEMGenerateSpec;
import org.bouncycastle.jcajce.spec.MLKEMParameterSpec;

public class RoundTrip {
    public static void main(String[] args) {
        Security.addProvider(new BouncyCastleProvider());                         // [1]
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("ML-KEM", "BC");   // [2]
            kpg.initialize(MLKEMParameterSpec.ml_kem_768, new SecureRandom());     // [3]
            KeyPair kp = kpg.generateKeyPair();                                    // [4]

            KeyGenerator enc = KeyGenerator.getInstance("ML-KEM", "BC");          // [5]
            enc.init(new KEMGenerateSpec(kp.getPublic(), "AES", 256), new SecureRandom());
            SecretKeyWithEncapsulation sent = (SecretKeyWithEncapsulation) enc.generateKey();
            byte[] ct = sent.getEncapsulation();                                   // [6]

            KeyGenerator dec = KeyGenerator.getInstance("ML-KEM", "BC");          // [7]
            dec.init(new KEMExtractSpec(kp.getPrivate(), ct, "AES", 256));
            SecretKeyWithEncapsulation recv = (SecretKeyWithEncapsulation) dec.generateKey();

            System.out.println("provider = " + kpg.getProvider().getName());       // [8]
            System.out.println("ctLen    = " + ct.length);
            System.out.println("match    = " + MessageDigest.isEqual(sent.getEncoded(), recv.getEncoded()));
        } catch (GeneralSecurityException e) {                                     // [9]
            System.err.println("KEM failure: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            System.exit(1);
        }
    }
}