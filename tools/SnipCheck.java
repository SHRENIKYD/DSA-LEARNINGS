import javax.tools.*;
import java.io.*;
import java.nio.file.*;
import java.util.*;

public class SnipCheck {
    public static void main(String[] args) throws Exception {
        JavaCompiler c = ToolProvider.getSystemJavaCompiler();
        try (StandardJavaFileManager fm = c.getStandardFileManager(null, null, null)) {
            for (String d : args) {
                Path out = Path.of(d, "out");
                Files.createDirectories(out);
                StringWriter w = new StringWriter();
                Iterable<? extends JavaFileObject> units = fm.getJavaFileObjects(Path.of(d, "Snip.java").toFile());
                boolean ok = c.getTask(w, fm, null, List.of("-d", out.toString(), "-nowarn", "-Xlint:none", "-proc:none", "-Xmaxerrs", "5"), null, units).call();
                System.out.println((ok ? "OK " : "FAIL ") + d);
                if (!ok) System.out.println(w.toString());
                System.out.println("@@END");
            }
        }
    }
}
