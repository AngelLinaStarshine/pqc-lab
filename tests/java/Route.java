import java.security.*; import javax.crypto.*;
import org.bouncycastle.jce.provider.BouncyCastleProvider; import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider;
public class Route { public static void main(String[] a) throws Exception {
  String cfg = a[0]; System.out.print("java " + System.getProperty("java.specification.version") + " cfg " + cfg + ": ");
  if (cfg.equals("none")) {}
  if (cfg.equals("A")) Security.addProvider(new BouncyCastleProvider());
  if (cfg.equals("B")) { Security.insertProviderAt(new BouncyCastlePQCProvider(), 1); Security.addProvider(new BouncyCastleProvider()); }
  if (cfg.equals("C")) Security.insertProviderAt(new BouncyCastleProvider(), 1);
  try { KeyPairGenerator g = KeyPairGenerator.getInstance("ML-KEM"); KeyPair kp = g.generateKeyPair();
    System.out.println("answered by " + g.getProvider().getName() + ", key alg " + kp.getPublic().getAlgorithm() + ", class " + kp.getPublic().getClass().getSimpleName());
  } catch (Exception e) { System.out.println(e); }
}}
