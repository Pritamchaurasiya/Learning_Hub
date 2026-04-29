#!/usr/bin/env python
"""
PHASE 2: ML Deep Dive & Audit
Comprehensive analysis of all ML components, models, and pipelines
"""

import os
import sys
import json
import ast
import time
from pathlib import Path
from typing import Dict, List, Any, Set
from collections import defaultdict
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
sys.path.insert(0, 'c:\\Users\\shiva\\Desktop\\windows_app\\conductor')

import django
django.setup()

from django.conf import settings

print("=" * 80)
print("🤖 PHASE 2: ML DEEP DIVE & AUDIT")
print("=" * 80)

class MLDeepAuditor:
    """Comprehensive ML audit and analysis."""
    
    def __init__(self):
        self.base_dir = Path('c:\\Users\\shiva\\Desktop\\windows_app\\conductor')
        self.ml_findings = {
            'models_found': [],
            'training_pipelines': [],
            'inference_endpoints': [],
            'datasets': [],
            'feature_engineering': [],
            'ml_issues': [],
            'optimization_opportunities': [],
            'ml_dependencies': set()
        }
        self.ml_catalog = defaultdict(list)
    
    def run_ml_audit(self) -> Dict[str, Any]:
        """Execute complete ML audit."""
        print("\n🔬 Running Comprehensive ML Audit...\n")
        
        # 1. Discover all ML files
        self._discover_ml_files()
        
        # 2. Analyze ML models
        self._analyze_ml_models()
        
        # 3. Analyze training pipelines
        self._analyze_training_pipelines()
        
        # 4. Analyze inference systems
        self._analyze_inference_systems()
        
        # 5. Analyze AI engine specifically
        self._analyze_ai_engine()
        
        # 6. Check ML dependencies
        self._analyze_ml_dependencies()
        
        # 7. Validate ML configurations
        self._validate_ml_config()
        
        # 8. Generate recommendations
        return self._generate_ml_report()
    
    def _discover_ml_files(self):
        """Discover all ML-related files."""
        print("📁 1. Discovering ML Files...")
        
        ml_keywords = [
            'sklearn', 'tensorflow', 'torch', 'keras', 'model', 'predict', 'train',
            'classification', 'regression', 'neural', 'embedding', 'vector',
            'clustering', 'ml', 'ai', 'gemini', 'openai', 'anthropic', 'inference',
            'preprocess', 'feature', 'dataset', 'learning', 'algorithm'
        ]
        
        ai_keywords = [
            'recommendation', 'recommender', 'similarity', 'cosine', 'collaborative',
            'filtering', 'content_based', 'matrix_factorization'
        ]
        
        nlp_keywords = [
            'nlp', 'tokeniz', 'embed', 'transformer', 'bert', 'gpt', 'llm',
            'text', 'sentiment', 'classification', 'named_entity', 'ner'
        ]
        
        cv_keywords = [
            'cv', 'computer_vision', 'image', 'cnn', 'convolution', 'opencv',
            'detect', 'recognition', 'face', 'object'
        ]
        
        ml_files = defaultdict(list)
        
        for py_file in self.base_dir.rglob('*.py'):
            if any(skip in str(py_file) for skip in ['venv', '__pycache__', 'migrations']):
                continue
            
            try:
                with open(py_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read().lower()
                    rel_path = str(py_file.relative_to(self.base_dir))
                    
                    # Check for ML keywords
                    if any(kw in content for kw in ml_keywords):
                        ml_files['general_ml'].append(rel_path)
                    
                    # Check for AI/Recommendation keywords
                    if any(kw in content for kw in ai_keywords):
                        ml_files['recommendation'].append(rel_path)
                    
                    # Check for NLP keywords
                    if any(kw in content for kw in nlp_keywords):
                        ml_files['nlp'].append(rel_path)
                    
                    # Check for CV keywords
                    if any(kw in content for kw in cv_keywords):
                        ml_files['computer_vision'].append(rel_path)
            except:
                pass
        
        total_ml = sum(len(files) for files in ml_files.values())
        
        print(f"   🤖 General ML: {len(ml_files['general_ml'])} files")
        print(f"   🎯 Recommendation: {len(ml_files['recommendation'])} files")
        print(f"   💬 NLP: {len(ml_files['nlp'])} files")
        print(f"   👁️  Computer Vision: {len(ml_files['computer_vision'])} files")
        print(f"   📊 Total ML files: {total_ml}")
        
        self.ml_catalog['files'] = dict(ml_files)
    
    def _analyze_ml_models(self):
        """Analyze ML model architectures and implementations."""
        print("\n🏗️  2. Analyzing ML Models...")
        
        models_found = []
        
        # Analyze ai_engine app specifically
        ai_engine_path = self.base_dir / 'apps' / 'ai_engine'
        if ai_engine_path.exists():
            for py_file in ai_engine_path.rglob('*.py'):
                try:
                    with open(py_file, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        tree = ast.parse(content)
                        
                        for node in ast.walk(tree):
                            if isinstance(node, ast.ClassDef):
                                # Check if it's a model class
                                if any('model' in base.id.lower() for base in node.bases if isinstance(base, ast.Name)):
                                    models_found.append({
                                        'file': str(py_file.relative_to(self.base_dir)),
                                        'name': node.name,
                                        'line': node.lineno
                                    })
                                elif 'model' in node.name.lower() or 'predictor' in node.name.lower():
                                    models_found.append({
                                        'file': str(py_file.relative_to(self.base_dir)),
                                        'name': node.name,
                                        'line': node.lineno
                                    })
                except:
                    pass
        
        print(f"   🧠 Models found: {len(models_found)}")
        for model in models_found[:5]:
            print(f"      - {model['name']} ({model['file']})")
        
        self.ml_findings['models_found'] = models_found
    
    def _analyze_training_pipelines(self):
        """Analyze training pipelines."""
        print("\n🎓 3. Analyzing Training Pipelines...")
        
        training_keywords = ['train', 'fit', 'epoch', 'batch', 'optimizer', 'loss', 'gradient']
        training_files = []
        
        for py_file in self.base_dir.rglob('*.py'):
            if any(skip in str(py_file) for skip in ['venv', '__pycache__']):
                continue
            
            try:
                with open(py_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read().lower()
                    if any(kw in content for kw in training_keywords):
                        training_files.append(str(py_file.relative_to(self.base_dir)))
            except:
                pass
        
        print(f"   🏋️  Training files: {len(training_files)}")
        
        self.ml_findings['training_pipelines'] = training_files
    
    def _analyze_inference_systems(self):
        """Analyze inference endpoints and serving infrastructure."""
        print("\n🚀 4. Analyzing Inference Systems...")
        
        inference_keywords = ['predict', 'infer', 'classify', 'recommend', 'embed', 'vectorize']
        inference_files = []
        
        for py_file in self.base_dir.rglob('*.py'):
            if any(skip in str(py_file) for skip in ['venv', '__pycache__']):
                continue
            
            try:
                with open(py_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read().lower()
                    if any(kw in content for kw in inference_keywords):
                        inference_files.append(str(py_file.relative_to(self.base_dir)))
            except:
                pass
        
        print(f"   ⚡ Inference files: {len(inference_files)}")
        
        self.ml_findings['inference_endpoints'] = inference_files
    
    def _analyze_ai_engine(self):
        """Deep analysis of AI engine."""
        print("\n🧠 5. Deep Analysis of AI Engine...")
        
        ai_engine_path = self.base_dir / 'apps' / 'ai_engine'
        
        if not ai_engine_path.exists():
            print("   ⚠️  AI Engine not found")
            return
        
        # Count files in AI engine
        total_files = len(list(ai_engine_path.rglob('*.py')))
        
        # Identify key components
        components = {
            'services': [],
            'models': [],
            'utils': [],
            'views': [],
            'tests': []
        }
        
        for py_file in ai_engine_path.rglob('*.py'):
            rel_path = str(py_file.relative_to(ai_engine_path))
            
            if 'service' in rel_path.lower():
                components['services'].append(rel_path)
            elif 'model' in rel_path.lower():
                components['models'].append(rel_path)
            elif 'util' in rel_path.lower():
                components['utils'].append(rel_path)
            elif 'view' in rel_path.lower():
                components['views'].append(rel_path)
            elif 'test' in rel_path.lower():
                components['tests'].append(rel_path)
        
        print(f"   📁 Total AI files: {total_files}")
        print(f"   🔧 Services: {len(components['services'])}")
        print(f"   🧠 Models: {len(components['models'])}")
        print(f"   🛠️  Utils: {len(components['utils'])}")
        print(f"   🌐 Views: {len(components['views'])}")
        print(f"   🧪 Tests: {len(components['tests'])}")
        
        self.ml_catalog['ai_engine'] = {
            'total_files': total_files,
            'components': components
        }
    
    def _analyze_ml_dependencies(self):
        """Analyze ML-specific dependencies."""
        print("\n📦 6. Analyzing ML Dependencies...")
        
        ml_packages = [
            'scikit-learn', 'sklearn', 'tensorflow', 'torch', 'keras',
            'xgboost', 'lightgbm', 'catboost', 'pandas', 'numpy',
            'scipy', 'matplotlib', 'seaborn', 'plotly', 'mlflow',
            'wandb', 'optuna', 'ray', 'transformers', 'datasets',
            'tokenizers', 'sentence-transformers', 'spacy', 'nltk',
            'gensim', 'opencv-python', 'pillow', 'timm', 'fastai'
        ]
        
        found_packages = []
        
        # Check requirements files
        for req_file in ['requirements/base.txt', 'requirements/development.txt']:
            req_path = self.base_dir / req_file
            if req_path.exists():
                with open(req_path, 'r') as f:
                    content = f.read().lower()
                    for pkg in ml_packages:
                        if pkg.lower() in content:
                            found_packages.append(pkg)
        
        print(f"   📚 ML packages: {len(found_packages)}")
        for pkg in found_packages[:10]:
            print(f"      - {pkg}")
        
        self.ml_findings['ml_dependencies'] = set(found_packages)
    
    def _validate_ml_config(self):
        """Validate ML configurations."""
        print("\n✅ 7. Validating ML Configurations...")
        
        issues = []
        
        # Check for AI API keys
        if hasattr(settings, 'GEMINI_API_KEY'):
            key = settings.GEMINI_API_KEY
            if key and not key.startswith('dev-'):
                print("   ✅ GEMINI_API_KEY configured")
            else:
                issues.append({'type': 'WARNING', 'message': 'GEMINI_API_KEY using development value'})
        
        if hasattr(settings, 'OPENAI_API_KEY'):
            key = settings.OPENAI_API_KEY
            if key and not key.startswith('dev-'):
                print("   ✅ OPENAI_API_KEY configured")
            else:
                issues.append({'type': 'WARNING', 'message': 'OPENAI_API_KEY using development value'})
        
        # Check for vector database configuration
        vector_db_found = False
        for app in settings.INSTALLED_APPS:
            if 'vector' in app.lower() or 'pgvector' in app.lower():
                vector_db_found = True
                break
        
        if vector_db_found:
            print("   ✅ Vector database support detected")
        else:
            issues.append({'type': 'INFO', 'message': 'No vector database support detected'})
        
        # Check for ML-specific middleware
        ml_middleware = [m for m in settings.MIDDLEWARE if any(x in m.lower() for x in ['ml', 'ai', 'predict'])]
        print(f"   🔧 ML Middleware: {len(ml_middleware)} found")
        
        self.ml_findings['ml_issues'] = issues
        
        print(f"   ⚠️  Issues found: {len(issues)}")
    
    def _generate_ml_report(self) -> Dict[str, Any]:
        """Generate comprehensive ML report."""
        print("\n" + "=" * 80)
        print("📊 ML AUDIT REPORT")
        print("=" * 80)
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': {
                'ml_files_general': len(self.ml_catalog['files'].get('general_ml', [])),
                'recommendation_files': len(self.ml_catalog['files'].get('recommendation', [])),
                'nlp_files': len(self.ml_catalog['files'].get('nlp', [])),
                'cv_files': len(self.ml_catalog['files'].get('computer_vision', [])),
                'models_found': len(self.ml_findings['models_found']),
                'training_pipelines': len(self.ml_findings['training_pipelines']),
                'inference_endpoints': len(self.ml_findings['inference_endpoints']),
                'ml_dependencies': len(self.ml_findings['ml_dependencies']),
                'issues_found': len(self.ml_findings['ml_issues'])
            },
            'catalog': dict(self.ml_catalog),
            'findings': {
                'models': self.ml_findings['models_found'],
                'training_pipelines': self.ml_findings['training_pipelines'][:20],
                'inference_endpoints': self.ml_findings['inference_endpoints'][:20],
                'issues': self.ml_findings['ml_issues']
            },
            'recommendations': self._generate_ml_recommendations()
        }
        
        # Display summary
        summary = report['summary']
        print(f"\n📈 ML AUDIT SUMMARY:")
        print(f"   🤖 General ML files: {summary['ml_files_general']}")
        print(f"   🎯 Recommendation files: {summary['recommendation_files']}")
        print(f"   💬 NLP files: {summary['nlp_files']}")
        print(f"   👁️  CV files: {summary['cv_files']}")
        print(f"   🧠 Models found: {summary['models_found']}")
        print(f"   🏋️  Training pipelines: {summary['training_pipelines']}")
        print(f"   ⚡ Inference endpoints: {summary['inference_endpoints']}")
        print(f"   📚 ML dependencies: {summary['ml_dependencies']}")
        print(f"   ⚠️  Issues: {summary['issues_found']}")
        
        # Save report
        report_file = f'PHASE2_ML_AUDIT_{int(time.time())}.json'
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📄 Detailed ML report saved: {report_file}")
        print("=" * 80)
        
        return report
    
    def _generate_ml_recommendations(self) -> List[str]:
        """Generate ML-specific recommendations."""
        recommendations = []
        
        if not self.ml_findings['ml_dependencies']:
            recommendations.append("Install core ML dependencies (scikit-learn, pandas, numpy)")
        
        if len(self.ml_findings['training_pipelines']) == 0:
            recommendations.append("Implement proper model training pipelines with versioning")
        
        if len(self.ml_findings['inference_endpoints']) == 0:
            recommendations.append("Set up model serving infrastructure with API endpoints")
        
        recommendations.extend([
            "Implement model monitoring and drift detection",
            "Set up experiment tracking (MLflow or Weights & Biases)",
            "Create model cards for documentation",
            "Implement A/B testing for model versions",
            "Set up automated model retraining triggers",
            "Implement feature store for consistent feature engineering",
            "Add model explainability (SHAP, LIME)",
            "Set up model performance dashboards",
            "Implement data validation for ML pipelines",
            "Create automated model testing suites"
        ])
        
        return recommendations

def main():
    """Main entry point."""
    auditor = MLDeepAuditor()
    report = auditor.run_ml_audit()
    
    print("\n✅ PHASE 2: ML DEEP DIVE COMPLETE")
    print("=" * 80)
    print(f"\n🤖 Analyzed {report['summary']['ml_files_general']} ML files")
    print(f"🧠 Found {report['summary']['models_found']} models")
    print(f"🏋️  Cataloged {report['summary']['training_pipelines']} training pipelines")
    print(f"⚡ Identified {report['summary']['inference_endpoints']} inference endpoints")
    print("\nReady for Phase 3: Debugging & Comprehensive Fixing")
    print("=" * 80 + "\n")

if __name__ == '__main__':
    main()
