export type Lang = { id: number; key: string; name: string; template: string };

// Judge0 CE language IDs
export const LANGUAGES: Lang[] = [
  { id: 1003, key: "web", name: "Web (HTML/CSS/JS)", template: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My web app</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #172033; }
    button { padding: 0.6rem 1rem; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Hello, World!</h1>
  <button id="greet">Click me</button>
  <script>
    document.querySelector("#greet").addEventListener("click", () => {
      document.querySelector("h1").textContent = "JavaScript is working!";
    });
  </script>
</body>
</html>
` },
  { id: 1001, key: "html", name: "HTML", template: '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>My page</title>\n</head>\n<body>\n  <h1>Hello, World!</h1>\n  <p>Edit this HTML and press Run to preview it.</p>\n</body>\n</html>\n' },
  { id: 1002, key: "css", name: "CSS", template: 'body {\n  margin: 0;\n  min-height: 100vh;\n  display: grid;\n  place-items: center;\n  background: #f1f5f9;\n  color: #172033;\n  font-family: system-ui, sans-serif;\n}\n\nh1 { color: #d97706; }\n' },
  { id: 71, key: "python", name: "Python 3", template: 'print("Hello, World!")\n' },
  { id: 63, key: "javascript", name: "JavaScript", template: 'console.log("Hello, World!");\n' },
  { id: 74, key: "typescript", name: "TypeScript", template: 'const greet = (n: string): string => `Hello, ${n}!`;\nconsole.log(greet("World"));\n' },
  { id: 54, key: "cpp", name: "C++ (GCC)", template: '#include <iostream>\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}\n' },
  { id: 50, key: "c", name: "C (GCC)", template: '#include <stdio.h>\nint main() {\n  printf("Hello, World!\\n");\n  return 0;\n}\n' },
  { id: 62, key: "java", name: "Java", template: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}\n' },
  { id: 51, key: "csharp", name: "C#", template: 'using System;\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello, World!");\n  }\n}\n' },
  { id: 60, key: "go", name: "Go", template: 'package main\nimport "fmt"\nfunc main() {\n  fmt.Println("Hello, World!")\n}\n' },
  { id: 73, key: "rust", name: "Rust", template: 'fn main() {\n    println!("Hello, World!");\n}\n' },
  { id: 78, key: "kotlin", name: "Kotlin", template: 'fun main() {\n    println("Hello, World!")\n}\n' },
  { id: 83, key: "swift", name: "Swift", template: 'print("Hello, World!")\n' },
  { id: 72, key: "ruby", name: "Ruby", template: 'puts "Hello, World!"\n' },
  { id: 68, key: "php", name: "PHP", template: '<?php\necho "Hello, World!\\n";\n' },
  { id: 81, key: "scala", name: "Scala", template: 'object Main extends App {\n  println("Hello, World!")\n}\n' },
  { id: 46, key: "bash", name: "Bash", template: 'echo "Hello, World!"\n' },
  { id: 82, key: "sql", name: "SQL (SQLite)", template: "CREATE TABLE t(x);\nINSERT INTO t VALUES ('Hello, World!');\nSELECT * FROM t;\n" },
  { id: 80, key: "r", name: "R", template: 'cat("Hello, World!\\n")\n' },
  { id: 64, key: "lua", name: "Lua", template: 'print("Hello, World!")\n' },
  { id: 85, key: "perl", name: "Perl", template: 'print "Hello, World!\\n";\n' },
  { id: 61, key: "haskell", name: "Haskell", template: 'main = putStrLn "Hello, World!"\n' },
  { id: 90, key: "dart", name: "Dart", template: "void main() {\n  print('Hello, World!');\n}\n" },
  { id: 87, key: "fsharp", name: "F#", template: 'printfn "Hello, World!"\n' },
  { id: 57, key: "elixir", name: "Elixir", template: 'IO.puts "Hello, World!"\n' },
  { id: 59, key: "fortran", name: "Fortran", template: "program hello\n  print *, 'Hello, World!'\nend program hello\n" },
  { id: 45, key: "asm", name: "Assembly (NASM)", template: "section .data\n  msg db 'Hello, World!', 10\nsection .text\n  global _start\n_start:\n  mov eax, 4\n  mov ebx, 1\n  mov ecx, msg\n  mov edx, 14\n  int 0x80\n  mov eax, 1\n  xor ebx, ebx\n  int 0x80\n" },
];
