import java.security.*; import java.security.spec.*; import java.util.*; import javax.crypto.*;
import org.bouncycastle.jce.provider.BouncyCastleProvider; import org.bouncycastle.jcajce.*; import org.bouncycastle.jcajce.interfaces.MLKEMKey; import org.bouncycastle.jcajce.spec.*;
public class Probe2 { static void p(String k,Object v){System.out.println(k+" = "+v);}
 public static void main(String[] a) throws Exception { Security.addProvider(new BouncyCastleProvider());
  KeyPairGenerator g = KeyPairGenerator.getInstance("ML-KEM","BC");
  try { g.initialize(new ECGenParameterSpec("secp256r1")); KeyPair kp=g.generateKeyPair(); p("ecSpec.then.set", ((MLKEMKey)kp.getPublic()).getParameterSpec().getName()); } catch(Exception e){p("ecSpec.gen",e);}
  try { g.initialize(new RSAKeyGenParameterSpec(2048, RSAKeyGenParameterSpec.F4)); p("rsaSpec","accepted"); } catch(Exception e){p("rsaSpec",e);}
  try { g.initialize(256); p("initialize(int 256)","accepted -> "+((MLKEMKey)g.generateKeyPair().getPublic()).getParameterSpec().getName()); } catch(Exception e){p("initialize(int)",e);}
  try { g.initialize(MLKEMParameterSpec.ml_kem_768, new SecureRandom()); } catch(Exception e){}
  KeyPair kp = g.generateKeyPair(); KeyGenerator e1=KeyGenerator.getInstance("ML-KEM","BC"); e1.init(new KEMGenerateSpec(kp.getPublic(),"AES",256)); SecretKeyWithEncapsulation s=(SecretKeyWithEncapsulation)e1.generateKey();
  for(int len: new int[]{1087,1089,0}){ KeyGenerator d=KeyGenerator.getInstance("ML-KEM","BC"); String where="init";
    try{ d.init(new KEMExtractSpec(kp.getPrivate(),Arrays.copyOf(s.getEncapsulation(),len),"AES",256)); where="generateKey"; d.generateKey(); p("len"+len,"no exception");}catch(Throwable t){p("len"+len+".at."+where, t.getClass().getName()+": "+t.getMessage());}}
  try{ KeyGenerator d=KeyGenerator.getInstance("ML-KEM","BC"); d.init(new KEMExtractSpec((PrivateKey)(Key)kp.getPublic(),s.getEncapsulation(),"AES",256)); }catch(Throwable t){p("publicKeyAsPrivate",t.getClass().getName());}
  try{ KeyGenerator d=KeyGenerator.getInstance("ML-KEM","BC"); d.init(new KEMGenerateSpec(kp.getPublic(),"AES",256)); KeyGenerator x=KeyGenerator.getInstance("ML-KEM","BC");
       // wrong key type to extract: use generate spec with private key cast
       x.init(new KEMGenerateSpec((PublicKey)(Key)kp.getPrivate(),"AES",256)); p("privAsPub","accepted"); }catch(Throwable t){p("privAsPub",t.getClass().getName()+": "+t.getMessage());}
 }}
