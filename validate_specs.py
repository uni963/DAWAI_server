#!/usr/bin/env python3
"""
Simple validation script for DAWAI specifications
"""

import yaml
from pathlib import Path

def validate_specs():
    """Validate specification files"""
    project_root = Path(".")
    specs_dir = Path("specs")

    print("DAWAI Specification Validation")
    print("=" * 40)

    errors = []
    warnings = []
    info = []

    # Check registry file
    registry_file = specs_dir / "meta" / "diagram_registry.yaml"
    if registry_file.exists():
        try:
            with open(registry_file, 'r', encoding='utf-8') as f:
                registry = yaml.safe_load(f)
                info.append(f"Registry loaded: {registry.get('version', 'unknown')}")
        except Exception as e:
            errors.append(f"Registry error: {e}")
    else:
        errors.append("Registry file not found")

    # Check ID mapping
    id_file = specs_dir / "meta" / "id_mapping.yaml"
    if id_file.exists():
        try:
            with open(id_file, 'r', encoding='utf-8') as f:
                id_mapping = yaml.safe_load(f)

                # Check functional requirements
                func_reqs = id_mapping.get('functional_requirements', {})
                implemented = sum(1 for req in func_reqs.values() if req.get('status') == 'implemented')
                total = len(func_reqs)

                info.append(f"Functional requirements: {implemented}/{total} implemented")

                # Check implementation files
                for req_id, req_data in func_reqs.items():
                    impl_files = req_data.get('implementation', '').split(',')
                    for impl_file in impl_files:
                        impl_file = impl_file.strip()
                        if impl_file:
                            if impl_file.endswith('/'):
                                # Directory check
                                if (project_root / impl_file).exists():
                                    info.append(f"{req_id}: Directory OK - {impl_file}")
                                else:
                                    errors.append(f"{req_id}: Directory missing - {impl_file}")
                            else:
                                # File check
                                if (project_root / impl_file).exists():
                                    info.append(f"{req_id}: File OK - {impl_file}")
                                else:
                                    errors.append(f"{req_id}: File missing - {impl_file}")

        except Exception as e:
            errors.append(f"ID mapping error: {e}")
    else:
        errors.append("ID mapping file not found")

    # Check key implementation files
    key_files = [
        "frontend/src/App.jsx",
        "backend/main.py",
        "backend/ai_agent/main.py",
        "frontend/src/utils/unifiedAudioSystem.js",
        "frontend/src/components/EnhancedMidiEditor.jsx"
    ]

    for file_path in key_files:
        if (project_root / file_path).exists():
            info.append(f"Key file OK: {file_path}")
        else:
            errors.append(f"Key file missing: {file_path}")

    # Check security issues
    security_files = [
        "backend/main.py",
        "backend/ai_agent/main.py"
    ]

    for file_path in security_files:
        full_path = project_root / file_path
        if full_path.exists():
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if 'allow_origins=["*"]' in content:
                        warnings.append(f"Security risk: CORS wildcard in {file_path}")
                    if 'host="0.0.0.0"' in content:
                        warnings.append(f"Security risk: Open host in {file_path}")
            except Exception as e:
                warnings.append(f"Could not check {file_path}: {e}")

    # Report results
    print(f"\nResults:")
    print(f"  Errors: {len(errors)}")
    print(f"  Warnings: {len(warnings)}")
    print(f"  Info: {len(info)}")

    if errors:
        print(f"\nErrors:")
        for error in errors:
            print(f"  - {error}")

    if warnings:
        print(f"\nWarnings:")
        for warning in warnings:
            print(f"  - {warning}")

    success_rate = len(info) / (len(info) + len(errors) + len(warnings)) * 100 if (len(info) + len(errors) + len(warnings)) > 0 else 100
    print(f"\nOverall Status: {'PASS' if len(errors) == 0 else 'FAIL'}")
    print(f"Success Rate: {success_rate:.1f}%")

    return len(errors) == 0

if __name__ == "__main__":
    validate_specs()