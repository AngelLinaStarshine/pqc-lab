import java.security.*; import java.util.*; import javax.crypto.*;
import org.bouncycastle.jce.provider.BouncyCastleProvider; import org.bouncycastle.jcajce.*; import org.bouncycastle.jcajce.spec.*;
public class Probe3 { public static void main(String[] a) throws Exception { Security.addProvider(new BouncyCastleProvider());
  KeyPairGenerator g = KeyPairGenerator.getInstance("ML-KEM","BC"); g.initialize(MLKEMParameterSpec.ml_kem_768,new SecureRandom()); KeyPair kp=g.generateKeyPair();
  KeyGenerator e=KeyGenerator.getInstance("ML-KEM","BC"); e.init(new KEMGenerateSpec(kp.getPublic(),"AES",256)); SecretKeyWithEncapsulation s=(SecretKeyWithEncapsulation)e.generateKey();
  for (int extra : new int[]{1, 100}) { byte[] ct=Arrays.copyOf(s.getEncapsulation(),1088+extra); ct[1088]=7;
    KeyGenerator d=KeyGenerator.getInstance("ML-KEM","BC"); d.init(new KEMExtractSpec(kp.getPrivate(),ct,"AES",256));
    System.out.println("len"+(1088+extra)+".match = "+MessageDigest.isEqual(s.getEncoded(), d.generateKey().getEncoded())); }
}}
