from __future__ import annotations

import random
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

TOPIC_ORDER = ["Arrays", "Strings", "Trees", "Graphs", "Dynamic Programming"]
DEFAULT_DURATION_MINUTES = 60

QUESTION_BANK: List[Dict[str, Any]] = [
    {
        "id": "arrays-max-subarray-sum",
        "topic": "Arrays",
        "difficulty": "Easy",
        "title": "Maximum Subarray Sum",
        "problem_statement": (
            "Given an integer array nums, return the maximum sum of any contiguous subarray. "
            "Implement the most efficient solution you can."
        ),
        "constraints": [
            "1 <= nums.length <= 100000",
            "-10000 <= nums[i] <= 10000",
            "The answer fits in a 32-bit integer.",
        ],
        "sample_input": "nums = [-2,1,-3,4,-1,2,1,-5,4]",
        "sample_output": "6",
        "explanation": "The subarray [4,-1,2,1] has the largest sum, which is 6.",
        "function_name": "maxSubarray",
        "starter_code": {
            "python": "from typing import List\n\n\ndef maxSubarray(nums: List[int]) -> int:\n    # Return the maximum subarray sum.\n    pass\n",
            "javascript": "function maxSubarray(nums) {\n  // Return the maximum subarray sum.\n}\n\nmodule.exports = maxSubarray;\n",
            "java": "import java.util.*;\n\nclass Solution {\n    public int maxSubarray(int[] nums) {\n        // Return the maximum subarray sum.\n        return 0;\n    }\n}\n",
            "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int maxSubarray(vector<int>& nums) {\n        // Return the maximum subarray sum.\n        return 0;\n    }\n};\n",
        },
        "public_test_cases": [
            {"inputs": {"nums": [-2, 1, -3, 4, -1, 2, 1, -5, 4]}, "expected": 6},
            {"inputs": {"nums": [1]}, "expected": 1},
            {"inputs": {"nums": [5, 4, -1, 7, 8]}, "expected": 23},
        ],
        "hidden_test_cases": [
            {"inputs": {"nums": [-1, -2, -3, -4]}, "expected": -1},
            {"inputs": {"nums": [8, -19, 5, -4, 20]}, "expected": 21},
        ],
    },
    {
        "id": "strings-longest-substring",
        "topic": "Strings",
        "difficulty": "Medium",
        "title": "Longest Substring Without Repeating Characters",
        "problem_statement": (
            "Given a string s, return the length of the longest substring without repeating characters."
        ),
        "constraints": [
            "0 <= s.length <= 50000",
            "s consists of English letters, digits, symbols, and spaces.",
        ],
        "sample_input": "s = 'abcabcbb'",
        "sample_output": "3",
        "explanation": "The answer is 'abc', which has length 3.",
        "function_name": "lengthOfLongestSubstring",
        "starter_code": {
            "python": "def lengthOfLongestSubstring(s: str) -> int:\n    # Return the length of the longest substring without repeating characters.\n    pass\n",
            "javascript": "function lengthOfLongestSubstring(s) {\n  // Return the length of the longest substring without repeating characters.\n}\n\nmodule.exports = lengthOfLongestSubstring;\n",
            "java": "import java.util.*;\n\nclass Solution {\n    public int lengthOfLongestSubstring(String s) {\n        // Return the length of the longest substring without repeating characters.\n        return 0;\n    }\n}\n",
            "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int lengthOfLongestSubstring(string s) {\n        // Return the length of the longest substring without repeating characters.\n        return 0;\n    }\n};\n",
        },
        "public_test_cases": [
            {"inputs": {"s": "abcabcbb"}, "expected": 3},
            {"inputs": {"s": "bbbbb"}, "expected": 1},
            {"inputs": {"s": "pwwkew"}, "expected": 3},
        ],
        "hidden_test_cases": [
            {"inputs": {"s": ""}, "expected": 0},
            {"inputs": {"s": "dvdf"}, "expected": 3},
        ],
    },
    {
        "id": "trees-max-depth",
        "topic": "Trees",
        "difficulty": "Medium",
        "title": "Maximum Depth of Binary Tree",
        "problem_statement": (
            "Given the level-order serialization of a binary tree, return its maximum depth. "
            "The input array uses the string 'null' for missing nodes."
        ),
        "constraints": [
            "1 <= number of nodes <= 10000",
            "Node values are integers and may repeat.",
        ],
        "sample_input": "level_order = ['3','9','20','null','null','15','7']",
        "sample_output": "3",
        "explanation": "The tree has three levels, so the maximum depth is 3.",
        "function_name": "maxDepth",
        "starter_code": {
            "python": "from collections import deque\nfrom typing import List, Optional\n\n\nclass TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n\ndef maxDepth(root: Optional[TreeNode]) -> int:\n    # Return the maximum depth of the tree.\n    pass\n",
            "javascript": "class TreeNode {\n  constructor(val = 0, left = null, right = null) {\n    this.val = val;\n    this.left = left;\n    this.right = right;\n  }\n}\n\nfunction maxDepth(root) {\n  // Return the maximum depth of the tree.\n}\n\nmodule.exports = { maxDepth, TreeNode };\n",
            "java": "import java.util.*;\n\nclass TreeNode {\n    int val;\n    TreeNode left;\n    TreeNode right;\n    TreeNode(int val) { this.val = val; }\n}\n\nclass Solution {\n    public int maxDepth(TreeNode root) {\n        // Return the maximum depth of the tree.\n        return 0;\n    }\n}\n",
            "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nstruct TreeNode {\n    int val;\n    TreeNode* left;\n    TreeNode* right;\n    TreeNode(int value) : val(value), left(nullptr), right(nullptr) {}\n};\n\nclass Solution {\npublic:\n    int maxDepth(TreeNode* root) {\n        // Return the maximum depth of the tree.\n        return 0;\n    }\n};\n",
        },
        "public_test_cases": [
            {"inputs": {"level_order": ["3", "9", "20", "null", "null", "15", "7"]}, "expected": 3},
            {"inputs": {"level_order": ["1", "null", "2"]}, "expected": 2},
            {"inputs": {"level_order": []}, "expected": 0},
        ],
        "hidden_test_cases": [
            {"inputs": {"level_order": ["1", "2", "3", "4", "5", "null", "6", "7"]}, "expected": 4},
            {"inputs": {"level_order": ["1"]}, "expected": 1},
        ],
    },
    {
        "id": "graphs-number-of-islands",
        "topic": "Graphs",
        "difficulty": "Hard",
        "title": "Number of Islands",
        "problem_statement": (
            "Given a grid of strings where '1' represents land and '0' represents water, "
            "return the number of islands. Cells are connected horizontally and vertically."
        ),
        "constraints": [
            "1 <= grid.length <= 300",
            "1 <= grid[i].length <= 300",
            "grid[i] contains only '0' and '1'.",
        ],
        "sample_input": "grid = ['11110','11010','11000','00000']",
        "sample_output": "1",
        "explanation": "All land cells are connected into a single island.",
        "function_name": "numIslands",
        "starter_code": {
            "python": "from typing import List\n\n\ndef numIslands(grid: List[str]) -> int:\n    # Return the number of islands.\n    pass\n",
            "javascript": "function numIslands(grid) {\n  // Return the number of islands.\n}\n\nmodule.exports = numIslands;\n",
            "java": "import java.util.*;\n\nclass Solution {\n    public int numIslands(String[] grid) {\n        // Return the number of islands.\n        return 0;\n    }\n}\n",
            "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int numIslands(vector<string>& grid) {\n        // Return the number of islands.\n        return 0;\n    }\n};\n",
        },
        "public_test_cases": [
            {"inputs": {"grid": ["11110", "11010", "11000", "00000"]}, "expected": 1},
            {"inputs": {"grid": ["11000", "11000", "00100", "00011"]}, "expected": 3},
            {"inputs": {"grid": ["0"]}, "expected": 0},
        ],
        "hidden_test_cases": [
            {"inputs": {"grid": ["1", "1", "1", "1"]}, "expected": 1},
            {"inputs": {"grid": ["10", "01"]}, "expected": 2},
        ],
    },
    {
        "id": "dp-coin-change",
        "topic": "Dynamic Programming",
        "difficulty": "Hard",
        "title": "Coin Change",
        "problem_statement": (
            "Given coin denominations and a target amount, return the fewest number of coins needed to make the amount. "
            "Return -1 if it is not possible."
        ),
        "constraints": [
            "1 <= coins.length <= 12",
            "1 <= coins[i] <= 10000",
            "0 <= amount <= 10000",
        ],
        "sample_input": "coins = [1,2,5], amount = 11",
        "sample_output": "3",
        "explanation": "11 = 5 + 5 + 1, so the minimum number of coins is 3.",
        "function_name": "coinChange",
        "starter_code": {
            "python": "from typing import List\n\n\ndef coinChange(coins: List[int], amount: int) -> int:\n    # Return the minimum number of coins required.\n    pass\n",
            "javascript": "function coinChange(coins, amount) {\n  // Return the minimum number of coins required.\n}\n\nmodule.exports = coinChange;\n",
            "java": "import java.util.*;\n\nclass Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Return the minimum number of coins required.\n        return 0;\n    }\n}\n",
            "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int coinChange(vector<int>& coins, int amount) {\n        // Return the minimum number of coins required.\n        return 0;\n    }\n};\n",
        },
        "public_test_cases": [
            {"inputs": {"coins": [1, 2, 5], "amount": 11}, "expected": 3},
            {"inputs": {"coins": [2], "amount": 3}, "expected": -1},
            {"inputs": {"coins": [1], "amount": 0}, "expected": 0},
        ],
        "hidden_test_cases": [
            {"inputs": {"coins": [1, 3, 4], "amount": 6}, "expected": 2},
            {"inputs": {"coins": [2, 5, 10, 1], "amount": 27}, "expected": 4},
        ],
    },
]

QUESTION_TOPIC_INDEX = {question["topic"]: question for question in QUESTION_BANK}
QUESTION_ID_INDEX = {question["id"]: question for question in QUESTION_BANK}


def get_topic_question(topic: str) -> Dict[str, Any]:
    return deepcopy(QUESTION_TOPIC_INDEX[topic])


def get_question(question_id: str) -> Dict[str, Any]:
    return deepcopy(QUESTION_ID_INDEX[question_id])


def get_public_question(question: Dict[str, Any]) -> Dict[str, Any]:
    return {
        key: deepcopy(value)
        for key, value in question.items()
        if key not in {"hidden_test_cases"}
    }


def get_public_bank() -> List[Dict[str, Any]]:
    return [get_public_question(question) for question in QUESTION_BANK]


def select_daily_questions() -> List[Dict[str, Any]]:
    selected = []
    for topic in TOPIC_ORDER:
        topic_questions = [question for question in QUESTION_BANK if question["topic"] == topic]
        selected.append(deepcopy(random.choice(topic_questions)))
    return selected


def build_assessment_document(user_id: str, selected_questions: List[Dict[str, Any]], duration_minutes: int = DEFAULT_DURATION_MINUTES) -> Dict[str, Any]:
    started_at = datetime.now(timezone.utc)
    return {
        "user_id": user_id,
        "duration_minutes": duration_minutes,
        "started_at": started_at,
        "ends_at": started_at.timestamp() + duration_minutes * 60,
        "status": "in_progress",
        "question_ids": [question["id"] for question in selected_questions],
        "violation_count": 0,
        "created_at": started_at,
        "updated_at": started_at,
    }
