import sys
import os
import re

def main():
    if len(sys.argv) < 3:
        print("Usage: python task-brief.py PLAN_FILE TASK_NUMBER")
        sys.exit(1)
        
    plan_file = sys.argv[1]
    task_num = sys.argv[2]
    
    if not os.path.exists(plan_file):
        print(f"Error: plan file not found at {plan_file}")
        sys.exit(1)
        
    with open(plan_file, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Find Task N block
    # Matches "### Task N:" or "### Task N "
    pattern = r"(### Task\s+" + re.escape(task_num) + r"(?::|\s).*?)(?=\n### Task|\Z)"
    match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
    
    if not match:
        print(f"Error: Task {task_num} not found in {plan_file}")
        sys.exit(1)
        
    task_content = match.group(1).strip()
    
    # Write to output file
    out_dir = r"c:\Projek\Cpulse_package\.superpowers\sdd"
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, f"task-{task_num}-brief.md")
    
    # Write the task content with the global constraints added at the top
    global_constraints = ""
    # Extract global constraints from the plan
    gc_match = re.search(r"## Global Constraints\n(.*?)(?=\n---|\n### Task|\Z)", content, re.DOTALL)
    if gc_match:
        global_constraints = gc_match.group(1).strip()
        
    final_brief = f"# Task {task_num} Brief\n\n## Global Constraints\n{global_constraints}\n\n{task_content}"
    
    with open(out_file, "w", encoding="utf-8", newline="\n") as f:
        f.write(final_brief)
        
    print(out_file)

if __name__ == "__main__":
    main()
