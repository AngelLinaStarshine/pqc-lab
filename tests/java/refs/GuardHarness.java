import java.security.Key;
import org.bouncycastle.jcajce.interfaces.MLKEMKey;
import java.security.*; import org.bouncycastle.jce.provider.BouncyCastleProvider; import org.bouncycastle.pqc.jcajce.provider.BouncyCastlePQCProvider; import org.bouncycastle.jcajce.spec.MLKEMParameterSpec;
public class GuardHarness {

static void requireBcMlKem768(Key k) {
    if (!(k instanceof MLKEMKey mk)) {
        throw new IllegalArgumentException(
            "not a BC ML-KEM key: " + (k == null ? "null" : k.getClass().getName()));
    }
    String set = mk.getParameterSpec().getName();
    if (!"ML-KEM-768".equals(set)) {                 // confirm exact string on the lab VM
        throw new IllegalArgumentException("wrong parameter set: " + set);
    }
}
  static void tryKey(String label, Key k){ try { requireBcMlKem768(k); System.out.println(label+" -> accepted"); } catch(IllegalArgumentException e){ System.out.println(label+" -> IllegalArgumentException: "+e.getMessage()); } }
  public static void main(String[] a) throws Exception { Security.addProvider(new BouncyCastleProvider()); Security.addProvider(new BouncyCastlePQCProvider());
    for (MLKEMParameterSpec s : new MLKEMParameterSpec[]{MLKEMParameterSpec.ml_kem_768, MLKEMParameterSpec.ml_kem_512}) { KeyPairGenerator g=KeyPairGenerator.getInstance("ML-KEM","BC"); g.initialize(s,new SecureRandom()); tryKey("BC "+s.getName()+" key", g.generateKeyPair().getPublic()); }
    tryKey("non-BC key (BCPQC ML-KEM-768)", KeyPairGenerator.getInstance("ML-KEM-768","BCPQC").generateKeyPair().getPublic());
    tryKey("null", null);
  }}