from __future__ import annotations

import json
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import Any, Dict, List

from app.services.dsa_bank import get_question


@dataclass
class ExecutionResult:
    passed: bool
    expected: Any
    actual: Any
    runtime_ms: float
    error: str | None = None


@dataclass
class LanguageEnvironment:
    language: str
    command: str
    file_name: str


SUPPORTED_LANGUAGES = {"python", "javascript", "java", "cpp"}


def detect_language_runtime(language: str) -> str | None:
    normalized = language.lower().strip()
    if normalized == "python":
        return shutil.which("python") or shutil.which("python3")
    if normalized == "javascript":
        return shutil.which("node")
    if normalized == "java":
        return shutil.which("java") if shutil.which("javac") and shutil.which("java") else None
    if normalized == "cpp":
        return shutil.which("g++") or shutil.which("clang++")
    return None


def _python_tree_builder() -> str:
    return """
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def build_tree(level_order):
    if not level_order:
        return None
    values = [None if value == "null" else int(value) for value in level_order]
    nodes = [TreeNode(value) if value is not None else None for value in values]
    child = 1
    for index, node in enumerate(nodes):
        if node is None:
            continue
        if child < len(nodes):
            node.left = nodes[child]
            child += 1
        if child < len(nodes):
            node.right = nodes[child]
            child += 1
    return nodes[0]
"""


def _python_harness(question: Dict[str, Any], code: str, test_cases: List[Dict[str, Any]]) -> str:
    tests_literal = json.dumps(test_cases)
    if question["topic"] == "Trees":
        tree_builder = _python_tree_builder()
    else:
        tree_builder = ""

    harness = [
        "import json",
        "import time",
        tree_builder,
        code,
        f"TEST_CASES = {tests_literal}",
        "def _call(case):",
    ]

    topic = question["topic"]
    function_name = question["function_name"]
    if topic == "Arrays":
        harness.append(f"    return {function_name}(case['inputs']['nums'])")
    elif topic == "Strings":
        harness.append(f"    return {function_name}(case['inputs']['s'])")
    elif topic == "Trees":
        harness.append(f"    return {function_name}(build_tree(case['inputs']['level_order']))")
    elif topic == "Graphs":
        harness.append(f"    return {function_name}(case['inputs']['grid'])")
    else:
        harness.append(f"    return {function_name}(case['inputs']['coins'], case['inputs']['amount'])")

    harness.extend(
        [
            "for index, case in enumerate(TEST_CASES, start=1):",
            "    started = time.perf_counter()",
            "    error = None",
            "    actual = None",
            "    try:",
            "        actual = _call(case)",
            "        passed = actual == case['expected']",
            "    except Exception as exc:",
            "        passed = False",
            "        error = str(exc)",
            "    runtime_ms = round((time.perf_counter() - started) * 1000, 2)",
            "    print(f'TEST_RESULT::{index}::{int(bool(passed))}::{json.dumps(case[\"expected\"])}::{json.dumps(actual)}::{runtime_ms}::{json.dumps(error) if error else \"null\"}')",
        ]
    )
    return "\n".join(part for part in harness if part)


def _javascript_tree_builder() -> str:
    return """
class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

function buildTree(levelOrder) {
  if (!levelOrder || levelOrder.length === 0) {
    return null;
  }
  const values = levelOrder.map((value) => (value === 'null' ? null : Number(value)));
  const nodes = values.map((value) => (value === null ? null : new TreeNode(value)));
    let child = 1;
    for (let index = 0; index < nodes.length && child < nodes.length; index += 1) {
        const node = nodes[index];
        if (!node) {
            continue;
        }
        if (child < nodes.length) {
            node.left = nodes[child];
            child += 1;
        }
        if (child < nodes.length) {
            node.right = nodes[child];
            child += 1;
        }
  }
  return nodes[0];
}
"""


def _javascript_harness(question: Dict[str, Any], code: str, test_cases: List[Dict[str, Any]]) -> str:
    tests_literal = json.dumps(test_cases)
    helper = _javascript_tree_builder() if question["topic"] == "Trees" else ""
    topic = question["topic"]
    function_name = question["function_name"]

    if topic == "Trees":
        call_expression = f"{function_name}(buildTree(caseItem.inputs.level_order))"
    elif topic == "Arrays":
        call_expression = f"{function_name}(caseItem.inputs.nums)"
    elif topic == "Strings":
        call_expression = f"{function_name}(caseItem.inputs.s)"
    elif topic == "Graphs":
        call_expression = f"{function_name}(caseItem.inputs.grid)"
    else:
        call_expression = f"{function_name}(caseItem.inputs.coins, caseItem.inputs.amount)"

    return "\n".join(
        part
        for part in [
            "const util = require('util');",
            helper,
            code,
            f"const TEST_CASES = {tests_literal};",
            "for (let index = 0; index < TEST_CASES.length; index += 1) {",
            "  const caseItem = TEST_CASES[index];",
            "  const started = Date.now();",
            "  let actual = null;",
            "  let error = null;",
            "  let passed = false;",
            "  try {",
            f"    actual = {call_expression};",
            "    passed = JSON.stringify(actual) === JSON.stringify(caseItem.expected);",
            "  } catch (err) {",
            "    error = String(err && err.message ? err.message : err);",
            "  }",
            "  const runtimeMs = Date.now() - started;",
            "  console.log(`TEST_RESULT::${index + 1}::${passed ? 1 : 0}::${JSON.stringify(caseItem.expected)}::${JSON.stringify(actual)}::${runtimeMs}::${error ? JSON.stringify(error) : 'null'}`);",
            "}",
        ]
        if part
    )


def _java_tree_builder() -> str:
    return """
class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode(int val) { this.val = val; }
}

class TreeBuilder {
    static TreeNode build(String[] levelOrder) {
        if (levelOrder == null || levelOrder.length == 0) {
            return null;
        }
        Integer[] values = new Integer[levelOrder.length];
        for (int i = 0; i < levelOrder.length; i++) {
            if (levelOrder[i] == null || levelOrder[i].equals("null")) {
                values[i] = null;
            } else {
                values[i] = Integer.parseInt(levelOrder[i]);
            }
        }
        TreeNode[] nodes = new TreeNode[values.length];
        for (int i = 0; i < values.length; i++) {
            if (values[i] != null) {
                nodes[i] = new TreeNode(values[i]);
            }
        }
        int child = 1;
        for (int i = 0; i < nodes.length; i++) {
            TreeNode node = nodes[i];
            if (node == null) {
                continue;
            }
            if (child < nodes.length) {
                node.left = nodes[child++];
            }
            if (child < nodes.length) {
                node.right = nodes[child++];
            }
        }
        return nodes[0];
    }
}
"""


def _java_harness(question: Dict[str, Any], code: str, test_cases: List[Dict[str, Any]]) -> str:
    topic = question["topic"]
    function_name = question["function_name"]
    helper = _java_tree_builder() if topic == "Trees" else ""
    tests_literal = []
    for case in test_cases:
        inputs = case["inputs"]
        if topic == "Trees":
            tests_literal.append(json.dumps(inputs["level_order"]))
        elif topic == "Arrays":
            tests_literal.append(str(inputs["nums"]).replace("None", "null"))
        elif topic == "Strings":
            tests_literal.append(json.dumps(inputs["s"]))
        elif topic == "Graphs":
            tests_literal.append(json.dumps(inputs["grid"]))
        else:
            tests_literal.append(str(inputs["coins"]).replace("None", "null") + f"|{inputs['amount']}")

    harness_lines = [
        "import java.util.*;",
        helper,
        code,
        "public class Main {",
        "    public static void main(String[] args) throws Exception {",
        f"        Solution solution = new Solution();",
    ]

    for index, case in enumerate(test_cases, start=1):
        inputs = case["inputs"]
        expected = case["expected"]
        if topic == "Arrays":
            harness_lines.extend(
                [
                    f"        int[] nums{index} = new int[]{{{', '.join(str(value) for value in inputs['nums'])}}};",
                    f"        long started{index} = System.nanoTime();",
                    f"        int actual{index} = solution.{function_name}(nums{index});",
                    f"        long runtimeMs{index} = (System.nanoTime() - started{index}) / 1_000_000;",
                    f"        System.out.println(\"TEST_RESULT::{index}::\" + (actual{index} == {expected} ? 1 : 0) + \"::{expected}::\" + actual{index} + \"::\" + runtimeMs{index} + \"::null\");",
                ]
            )
        elif topic == "Strings":
            harness_lines.extend(
                [
                    f"        String s{index} = {json.dumps(inputs['s'])};",
                    f"        long started{index} = System.nanoTime();",
                    f"        int actual{index} = solution.{function_name}(s{index});",
                    f"        long runtimeMs{index} = (System.nanoTime() - started{index}) / 1_000_000;",
                    f"        System.out.println(\"TEST_RESULT::{index}::\" + (actual{index} == {expected} ? 1 : 0) + \"::{expected}::\" + actual{index} + \"::\" + runtimeMs{index} + \"::null\");",
                ]
            )
        elif topic == "Trees":
            level_order = ", ".join(json.dumps(value) for value in inputs["level_order"])
            harness_lines.extend(
                [
                    f"        String[] levelOrder{index} = new String[]{{{level_order}}};",
                    f"        TreeNode root{index} = TreeBuilder.build(levelOrder{index});",
                    f"        long started{index} = System.nanoTime();",
                    f"        int actual{index} = solution.{function_name}(root{index});",
                    f"        long runtimeMs{index} = (System.nanoTime() - started{index}) / 1_000_000;",
                    f"        System.out.println(\"TEST_RESULT::{index}::\" + (actual{index} == {expected} ? 1 : 0) + \"::{expected}::\" + actual{index} + \"::\" + runtimeMs{index} + \"::null\");",
                ]
            )
        elif topic == "Graphs":
            grid_literal = ", ".join(json.dumps(row) for row in inputs["grid"])
            harness_lines.extend(
                [
                    f"        String[] grid{index} = new String[]{{{grid_literal}}};",
                    f"        long started{index} = System.nanoTime();",
                    f"        int actual{index} = solution.{function_name}(grid{index});",
                    f"        long runtimeMs{index} = (System.nanoTime() - started{index}) / 1_000_000;",
                    f"        System.out.println(\"TEST_RESULT::{index}::\" + (actual{index} == {expected} ? 1 : 0) + \"::{expected}::\" + actual{index} + \"::\" + runtimeMs{index} + \"::null\");",
                ]
            )
        else:
            coins_literal = ", ".join(str(value) for value in inputs["coins"])
            harness_lines.extend(
                [
                    f"        int[] coins{index} = new int[]{{{coins_literal}}};",
                    f"        int amount{index} = {inputs['amount']};",
                    f"        long started{index} = System.nanoTime();",
                    f"        int actual{index} = solution.{function_name}(coins{index}, amount{index});",
                    f"        long runtimeMs{index} = (System.nanoTime() - started{index}) / 1_000_000;",
                    f"        System.out.println(\"TEST_RESULT::{index}::\" + (actual{index} == {expected} ? 1 : 0) + \"::{expected}::\" + actual{index} + \"::\" + runtimeMs{index} + \"::null\");",
                ]
            )

    harness_lines.extend([
        "    }",
        "}",
    ])
    return "\n".join(part for part in harness_lines if part is not None)


def _cpp_tree_builder() -> str:
    return """
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int value) : val(value), left(nullptr), right(nullptr) {}
};

TreeNode* buildTree(const vector<string>& levelOrder) {
    if (levelOrder.empty()) {
        return nullptr;
    }
    vector<TreeNode*> nodes;
    nodes.reserve(levelOrder.size());
    for (const auto& value : levelOrder) {
        if (value == "null") {
            nodes.push_back(nullptr);
        } else {
            nodes.push_back(new TreeNode(stoi(value)));
        }
    }
    size_t child = 1;
    for (size_t index = 0; index < nodes.size(); ++index) {
        TreeNode* node = nodes[index];
        if (node == nullptr) {
            continue;
        }
        if (child < nodes.size()) {
            node->left = nodes[child++];
        }
        if (child < nodes.size()) {
            node->right = nodes[child++];
        }
    }
    return nodes[0];
}
"""


def _cpp_harness(question: Dict[str, Any], code: str, test_cases: List[Dict[str, Any]]) -> str:
    topic = question["topic"]
    function_name = question["function_name"]
    helper = _cpp_tree_builder() if topic == "Trees" else ""

    lines = [
        "#include <bits/stdc++.h>",
        "using namespace std;",
        helper,
        code,
        "int main() {",
        "    Solution solution;",
    ]

    for index, case in enumerate(test_cases, start=1):
        inputs = case["inputs"]
        expected = case["expected"]
        if topic == "Arrays":
            nums_literal = ", ".join(str(value) for value in inputs["nums"])
            lines.extend(
                [
                    f"    vector<int> nums{index} = {{{nums_literal}}};",
                    f"    auto started{index} = chrono::high_resolution_clock::now();",
                    f"    int actual{index} = solution.{function_name}(nums{index});",
                    f"    auto runtimeMs{index} = chrono::duration_cast<chrono::milliseconds>(chrono::high_resolution_clock::now() - started{index}).count();",
                    f"    cout << \"TEST_RESULT::{index}::\" << (actual{index} == {expected} ? 1 : 0) << \"::{expected}::\" << actual{index} << \"::\" << runtimeMs{index} << \"::null\" << endl;",
                ]
            )
        elif topic == "Strings":
            lines.extend(
                [
                    f"    string s{index} = {json.dumps(inputs['s'])};",
                    f"    auto started{index} = chrono::high_resolution_clock::now();",
                    f"    int actual{index} = solution.{function_name}(s{index});",
                    f"    auto runtimeMs{index} = chrono::duration_cast<chrono::milliseconds>(chrono::high_resolution_clock::now() - started{index}).count();",
                    f"    cout << \"TEST_RESULT::{index}::\" << (actual{index} == {expected} ? 1 : 0) << \"::{expected}::\" << actual{index} << \"::\" << runtimeMs{index} << \"::null\" << endl;",
                ]
            )
        elif topic == "Trees":
            level_order_literal = ", ".join(json.dumps(value) for value in inputs["level_order"])
            lines.extend(
                [
                    f"    vector<string> levelOrder{index} = {{{level_order_literal}}};",
                    f"    TreeNode* root{index} = buildTree(levelOrder{index});",
                    f"    auto started{index} = chrono::high_resolution_clock::now();",
                    f"    int actual{index} = solution.{function_name}(root{index});",
                    f"    auto runtimeMs{index} = chrono::duration_cast<chrono::milliseconds>(chrono::high_resolution_clock::now() - started{index}).count();",
                    f"    cout << \"TEST_RESULT::{index}::\" << (actual{index} == {expected} ? 1 : 0) << \"::{expected}::\" << actual{index} << \"::\" << runtimeMs{index} << \"::null\" << endl;",
                ]
            )
        elif topic == "Graphs":
            grid_literal = ", ".join(json.dumps(row) for row in inputs["grid"])
            lines.extend(
                [
                    f"    vector<string> grid{index} = {{{grid_literal}}};",
                    f"    auto started{index} = chrono::high_resolution_clock::now();",
                    f"    int actual{index} = solution.{function_name}(grid{index});",
                    f"    auto runtimeMs{index} = chrono::duration_cast<chrono::milliseconds>(chrono::high_resolution_clock::now() - started{index}).count();",
                    f"    cout << \"TEST_RESULT::{index}::\" << (actual{index} == {expected} ? 1 : 0) << \"::{expected}::\" << actual{index} << \"::\" << runtimeMs{index} << \"::null\" << endl;",
                ]
            )
        else:
            coins_literal = ", ".join(str(value) for value in inputs["coins"])
            lines.extend(
                [
                    f"    vector<int> coins{index} = {{{coins_literal}}};",
                    f"    int amount{index} = {inputs['amount']};",
                    f"    auto started{index} = chrono::high_resolution_clock::now();",
                    f"    int actual{index} = solution.{function_name}(coins{index}, amount{index});",
                    f"    auto runtimeMs{index} = chrono::duration_cast<chrono::milliseconds>(chrono::high_resolution_clock::now() - started{index}).count();",
                    f"    cout << \"TEST_RESULT::{index}::\" << (actual{index} == {expected} ? 1 : 0) << \"::{expected}::\" << actual{index} << \"::\" << runtimeMs{index} << \"::null\" << endl;",
                ]
            )

    lines.extend(["    return 0;", "}"])
    return "\n".join(part for part in lines if part is not None)


def build_runtime_source(question: Dict[str, Any], language: str, code: str, test_cases: List[Dict[str, Any]]) -> str:
    normalized_language = language.lower().strip()
    if normalized_language == "python":
        return _python_harness(question, code, test_cases)
    if normalized_language == "javascript":
        return _javascript_harness(question, code, test_cases)
    if normalized_language == "java":
        return _java_harness(question, code, test_cases)
    if normalized_language == "cpp":
        return _cpp_harness(question, code, test_cases)
    raise ValueError(f"Unsupported language: {language}")


def parse_execution_output(output: str) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    for line in output.splitlines():
        if not line.startswith("TEST_RESULT::"):
            continue
        parts = line.split("::", 6)
        if len(parts) != 7:
            continue
        _, index, passed, expected, actual, runtime_ms, error = parts
        results.append(
            {
                "index": int(index),
                "passed": passed == "1",
                "expected": json.loads(expected),
                "actual": json.loads(actual),
                "runtime_ms": float(runtime_ms),
                "error": None if error == "null" else json.loads(error),
            }
        )
    return results


def run_code_for_question(question_id: str, language: str, code: str, hidden: bool = False) -> Dict[str, Any]:
    question = get_question(question_id)
    test_cases = question["hidden_test_cases"] if hidden else question["public_test_cases"]
    runner = detect_language_runtime(language)
    if runner is None:
        return {
            "status": "unavailable",
            "message": f"Runtime for {language} is not installed on the server.",
            "test_results": [],
            "passed": 0,
            "total": len(test_cases),
            "average_runtime_ms": 0.0,
        }

    source = build_runtime_source(question, language, code, test_cases)
    with tempfile.TemporaryDirectory() as temp_dir_name:
        temp_dir = Path(temp_dir_name)
        normalized_language = language.lower().strip()

        try:
            if normalized_language == "python":
                source_path = temp_dir / "main.py"
                source_path.write_text(source, encoding="utf-8")
                completed = subprocess.run([runner, str(source_path)], capture_output=True, text=True, timeout=8)
            elif normalized_language == "javascript":
                source_path = temp_dir / "main.js"
                source_path.write_text(source, encoding="utf-8")
                completed = subprocess.run([runner, str(source_path)], capture_output=True, text=True, timeout=8)
            elif normalized_language == "java":
                source_path = temp_dir / "Main.java"
                source_path.write_text(source, encoding="utf-8")
                compile_result = subprocess.run([shutil.which("javac") or "javac", str(source_path)], capture_output=True, text=True, timeout=20, cwd=temp_dir)
                if compile_result.returncode != 0:
                    return {
                        "status": "compile_error",
                        "message": compile_result.stderr.strip() or compile_result.stdout.strip() or "Java compilation failed",
                        "test_results": [],
                        "passed": 0,
                        "total": len(test_cases),
                        "average_runtime_ms": 0.0,
                    }
                completed = subprocess.run([runner, "Main"], capture_output=True, text=True, timeout=8, cwd=temp_dir)
            else:
                source_path = temp_dir / "main.cpp"
                source_path.write_text(source, encoding="utf-8")
                executable_path = temp_dir / ("main.exe" if shutil.which("g++") else "main.out")
                compiler = shutil.which("g++") or shutil.which("clang++") or "g++"
                compile_result = subprocess.run([compiler, "-std=c++17", "-O2", str(source_path), "-o", str(executable_path)], capture_output=True, text=True, timeout=30, cwd=temp_dir)
                if compile_result.returncode != 0:
                    return {
                        "status": "compile_error",
                        "message": compile_result.stderr.strip() or compile_result.stdout.strip() or "C++ compilation failed",
                        "test_results": [],
                        "passed": 0,
                        "total": len(test_cases),
                        "average_runtime_ms": 0.0,
                    }
                completed = subprocess.run([str(executable_path)], capture_output=True, text=True, timeout=8, cwd=temp_dir)
        except subprocess.TimeoutExpired:
            return {
                "status": "timeout",
                "message": "Execution timed out",
                "test_results": [],
                "passed": 0,
                "total": len(test_cases),
                "average_runtime_ms": 8000.0,
            }
        except FileNotFoundError as exc:
            return {
                "status": "unavailable",
                "message": str(exc),
                "test_results": [],
                "passed": 0,
                "total": len(test_cases),
                "average_runtime_ms": 0.0,
            }

    if completed.returncode != 0:
        return {
            "status": "runtime_error",
            "message": completed.stderr.strip() or completed.stdout.strip() or "Execution failed",
            "test_results": [],
            "passed": 0,
            "total": len(test_cases),
            "average_runtime_ms": 0.0,
        }

    parsed_results = parse_execution_output(completed.stdout)
    passed = sum(1 for result in parsed_results if result["passed"])
    average_runtime_ms = round(sum(result["runtime_ms"] for result in parsed_results) / max(len(parsed_results), 1), 2)
    return {
        "status": "success",
        "message": None,
        "test_results": parsed_results,
        "passed": passed,
        "total": len(test_cases),
        "average_runtime_ms": average_runtime_ms,
    }
