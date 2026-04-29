# Automated Deployment & CI/CD Pipeline
"""
Enterprise-grade continuous integration and deployment automation
"""

import os
import sys
import time
import json
import logging
import asyncio
import threading
import queue
import subprocess
import shutil
import yaml
import hashlib
import tarfile
import zipfile
import requests
from typing import Dict, List, Any, Optional, Tuple, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
from pathlib import Path
import statistics
import traceback
import psutil
import socket
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import schedule

# Setup Django
try:
    import django
    from django.conf import settings
    from django.core.cache import cache
    from django.db import connection, connections
    from django.core.management import execute_from_command_line
    from django.apps import apps
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
    django.setup()
    
    DJANGO_AVAILABLE = True
except ImportError:
    DJANGO_AVAILABLE = False
    print("Warning: Django not available")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DeploymentStage(Enum):
    """Deployment stages."""
    BUILD = "build"
    TEST = "test"
    SECURITY_SCAN = "security_scan"
    PACKAGE = "package"
    DEPLOY_STAGING = "deploy_staging"
    INTEGRATION_TEST = "integration_test"
    APPROVAL = "approval"
    DEPLOY_PRODUCTION = "deploy_production"
    HEALTH_CHECK = "health_check"
    ROLLBACK = "rollback"

class DeploymentStatus(Enum):
    """Deployment status."""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"
    ROLLED_BACK = "rolled_back"

class Environment(Enum):
    """Deployment environments."""
    DEVELOPMENT = "development"
    TESTING = "testing"
    STAGING = "staging"
    PRODUCTION = "production"

class PipelineTrigger(Enum):
    """Pipeline triggers."""
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    WEBHOOK = "webhook"
    COMMIT = "commit"
    MERGE = "merge"
    RELEASE = "release"

@dataclass
class BuildArtifact:
    """Build artifact information."""
    name: str
    version: str
    type: str  # docker, zip, tar, wheel, etc.
    path: str
    checksum: str
    size: int
    created_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class DeploymentConfig:
    """Deployment configuration."""
    environment: Environment
    app_name: str
    version: str
    build_config: Dict[str, Any] = field(default_factory=dict)
    test_config: Dict[str, Any] = field(default_factory=dict)
    security_config: Dict[str, Any] = field(default_factory=dict)
    deploy_config: Dict[str, Any] = field(default_factory=dict)
    rollback_config: Dict[str, Any] = field(default_factory=dict)
    notification_config: Dict[str, Any] = field(default_factory=dict)

@dataclass
class DeploymentJob:
    """Deployment job information."""
    id: str
    pipeline_id: str
    stage: DeploymentStage
    status: DeploymentStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration: float = 0.0
    logs: List[str] = field(default_factory=list)
    artifacts: List[BuildArtifact] = field(default_factory=list)
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class DeploymentPipeline:
    """Deployment pipeline information."""
    id: str
    name: str
    trigger: PipelineTrigger
    environment: Environment
    status: DeploymentStatus
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    jobs: List[DeploymentJob] = field(default_factory=list)
    config: DeploymentConfig = field(default_factory=lambda: DeploymentConfig(Environment.DEVELOPMENT, "", ""))
    commit_hash: Optional[str] = None
    branch: Optional[str] = None
    triggered_by: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class PipelineMetrics:
    """Pipeline metrics."""
    total_pipelines: int = 0
    successful_pipelines: int = 0
    failed_pipelines: int = 0
    cancelled_pipelines: int = 0
    avg_duration: float = 0.0
    success_rate: float = 0.0
    deployment_frequency: float = 0.0
    lead_time: float = 0.0
    mttr: float = 0.0  # Mean Time To Recovery
    change_failure_rate: float = 0.0

class AutomatedCICDPipeline:
    """Automated CI/CD pipeline system."""
    
    def __init__(self):
        self.pipelines: Dict[str, DeploymentPipeline] = {}
        self.jobs_queue = queue.Queue()
        self.pipeline_executor = ThreadPoolExecutor(max_workers=5)
        self.job_executor = ThreadPoolExecutor(max_workers=10)
        self.notification_executor = ThreadPoolExecutor(max_workers=3)
        self.running = False
        self.pipeline_thread = None
        self.start_time = time.time()
        self.metrics = PipelineMetrics()
        
        # Initialize default configurations
        self._initialize_default_configs()
        
        # Setup scheduled pipelines
        self._setup_scheduled_pipelines()
    
    def _initialize_default_configs(self):
        """Initialize default deployment configurations."""
        self.default_configs = {
            Environment.DEVELOPMENT: DeploymentConfig(
                environment=Environment.DEVELOPMENT,
                app_name="learning-hub-dev",
                version="latest",
                build_config={
                    "dockerfile": "Dockerfile.dev",
                    "build_args": {"ENV": "development"},
                    "cache": True
                },
                test_config={
                    "run_unit_tests": True,
                    "run_integration_tests": False,
                    "coverage_threshold": 70
                },
                security_config={
                    "run_security_scan": False,
                    "vulnerability_threshold": "medium"
                },
                deploy_config={
                    "strategy": "rolling",
                    "replicas": 1,
                    "health_check": True
                },
                notification_config={
                    "on_success": False,
                    "on_failure": True,
                    "channels": ["email"]
                }
            ),
            Environment.STAGING: DeploymentConfig(
                environment=Environment.STAGING,
                app_name="learning-hub-staging",
                version="staging",
                build_config={
                    "dockerfile": "Dockerfile",
                    "build_args": {"ENV": "staging"},
                    "cache": True
                },
                test_config={
                    "run_unit_tests": True,
                    "run_integration_tests": True,
                    "run_performance_tests": True,
                    "coverage_threshold": 80
                },
                security_config={
                    "run_security_scan": True,
                    "vulnerability_threshold": "low"
                },
                deploy_config={
                    "strategy": "rolling",
                    "replicas": 2,
                    "health_check": True,
                    "canary": False
                },
                notification_config={
                    "on_success": True,
                    "on_failure": True,
                    "channels": ["email", "slack"]
                }
            ),
            Environment.PRODUCTION: DeploymentConfig(
                environment=Environment.PRODUCTION,
                app_name="learning-hub-prod",
                version="production",
                build_config={
                    "dockerfile": "Dockerfile",
                    "build_args": {"ENV": "production"},
                    "cache": False
                },
                test_config={
                    "run_unit_tests": True,
                    "run_integration_tests": True,
                    "run_performance_tests": True,
                    "run_security_tests": True,
                    "coverage_threshold": 85
                },
                security_config={
                    "run_security_scan": True,
                    "vulnerability_threshold": "none"
                },
                deploy_config={
                    "strategy": "blue_green",
                    "replicas": 3,
                    "health_check": True,
                    "canary": True,
                    "canary_percentage": 10
                },
                notification_config={
                    "on_success": True,
                    "on_failure": True,
                    "channels": ["email", "slack", "sms"]
                }
            )
        }
    
    def _setup_scheduled_pipelines(self):
        """Setup scheduled pipelines."""
        # Schedule nightly staging deployment
        schedule.every().day.at("02:00").do(self._trigger_scheduled_pipeline, Environment.STAGING)
        
        # Schedule weekly production deployment (Sundays at 3 AM)
        schedule.every().sunday.at("03:00").do(self._trigger_scheduled_pipeline, Environment.PRODUCTION)
        
        # Schedule daily health checks
        schedule.every().day.at("09:00").do(self._run_health_checks)
    
    def start_pipeline_system(self):
        """Start the pipeline system."""
        if self.running:
            logger.warning("Pipeline system is already running")
            return
        
        self.running = True
        logger.info("Starting automated CI/CD pipeline system...")
        
        # Start pipeline processing thread
        self.pipeline_thread = threading.Thread(target=self._pipeline_loop, daemon=True)
        self.pipeline_thread.start()
        
        # Start scheduler thread
        scheduler_thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        scheduler_thread.start()
        
        logger.info("Automated CI/CD pipeline system started successfully")
    
    def stop_pipeline_system(self):
        """Stop the pipeline system."""
        if not self.running:
            logger.warning("Pipeline system is not running")
            return
        
        self.running = False
        logger.info("Stopping automated CI/CD pipeline system...")
        
        # Wait for thread to finish
        if self.pipeline_thread:
            self.pipeline_thread.join(timeout=10)
        
        # Shutdown executors
        self.pipeline_executor.shutdown(wait=True)
        self.job_executor.shutdown(wait=True)
        self.notification_executor.shutdown(wait=True)
        
        logger.info("Automated CI/CD pipeline system stopped")
    
    def _pipeline_loop(self):
        """Main pipeline processing loop."""
        while self.running:
            try:
                # Process jobs from queue
                while not self.jobs_queue.empty():
                    try:
                        job = self.jobs_queue.get_nowait()
                        self.job_executor.submit(self._execute_job, job)
                    except queue.Empty:
                        break
                
                # Check pipeline status and cleanup
                self._check_pipeline_status()
                self._cleanup_old_pipelines()
                
                # Sleep before next iteration
                time.sleep(5)
                
            except Exception as e:
                logger.error(f"Error in pipeline loop: {e}")
                time.sleep(5)
    
    def _scheduler_loop(self):
        """Scheduler loop for scheduled pipelines."""
        while self.running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                time.sleep(60)
    
    def trigger_pipeline(self, 
                       environment: Environment,
                       trigger: PipelineTrigger = PipelineTrigger.MANUAL,
                       commit_hash: Optional[str] = None,
                       branch: Optional[str] = None,
                       triggered_by: Optional[str] = None,
                       config_override: Optional[Dict[str, Any]] = None) -> str:
        """Trigger a deployment pipeline."""
        try:
            # Generate pipeline ID
            pipeline_id = f"pipeline_{int(time.time())}_{environment.value}"
            
            # Get configuration
            config = self.default_configs.get(environment)
            if not config:
                raise ValueError(f"No configuration found for environment: {environment.value}")
            
            # Apply configuration override
            if config_override:
                config = self._apply_config_override(config, config_override)
            
            # Create pipeline
            pipeline = DeploymentPipeline(
                id=pipeline_id,
                name=f"Deploy {config.app_name} to {environment.value}",
                trigger=trigger,
                environment=environment,
                status=DeploymentStatus.PENDING,
                created_at=datetime.now(),
                config=config,
                commit_hash=commit_hash,
                branch=branch,
                triggered_by=triggered_by
            )
            
            self.pipelines[pipeline_id] = pipeline
            self.metrics.total_pipelines += 1
            
            # Create initial jobs
            self._create_pipeline_jobs(pipeline)
            
            # Start pipeline
            pipeline.status = DeploymentStatus.RUNNING
            pipeline.started_at = datetime.now()
            
            # Queue first job
            if pipeline.jobs:
                self.jobs_queue.put(pipeline.jobs[0])
            
            logger.info(f"Pipeline triggered: {pipeline_id} for environment: {environment.value}")
            
            return pipeline_id
        
        except Exception as e:
            logger.error(f"Error triggering pipeline: {e}")
            raise
    
    def _create_pipeline_jobs(self, pipeline: DeploymentPipeline):
        """Create jobs for a pipeline."""
        jobs = []
        
        # Build stage
        if pipeline.environment == Environment.DEVELOPMENT:
            jobs.extend([
                DeploymentJob(
                    id=f"{pipeline.id}_build",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.BUILD,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_test",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.TEST,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_deploy",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.DEPLOY_STAGING,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                )
            ])
        
        elif pipeline.environment == Environment.STAGING:
            jobs.extend([
                DeploymentJob(
                    id=f"{pipeline.id}_build",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.BUILD,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_test",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.TEST,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_security",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.SECURITY_SCAN,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_package",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.PACKAGE,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_deploy",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.DEPLOY_STAGING,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_integration",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.INTEGRATION_TEST,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                )
            ])
        
        elif pipeline.environment == Environment.PRODUCTION:
            jobs.extend([
                DeploymentJob(
                    id=f"{pipeline.id}_build",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.BUILD,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_test",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.TEST,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_security",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.SECURITY_SCAN,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_package",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.PACKAGE,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_deploy_staging",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.DEPLOY_STAGING,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_integration",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.INTEGRATION_TEST,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_approval",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.APPROVAL,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_deploy_production",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.DEPLOY_PRODUCTION,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                ),
                DeploymentJob(
                    id=f"{pipeline.id}_health_check",
                    pipeline_id=pipeline.id,
                    stage=DeploymentStage.HEALTH_CHECK,
                    status=DeploymentStatus.PENDING,
                    started_at=datetime.now()
                )
            ])
        
        pipeline.jobs = jobs
    
    def _execute_job(self, job: DeploymentJob):
        """Execute a deployment job."""
        try:
            job.status = DeploymentStatus.RUNNING
            job.started_at = datetime.now()
            
            logger.info(f"Executing job: {job.id} - {job.stage.value}")
            
            # Execute job based on stage
            if job.stage == DeploymentStage.BUILD:
                self._execute_build_job(job)
            elif job.stage == DeploymentStage.TEST:
                self._execute_test_job(job)
            elif job.stage == DeploymentStage.SECURITY_SCAN:
                self._execute_security_job(job)
            elif job.stage == DeploymentStage.PACKAGE:
                self._execute_package_job(job)
            elif job.stage == DeploymentStage.DEPLOY_STAGING:
                self._execute_deploy_staging_job(job)
            elif job.stage == DeploymentStage.INTEGRATION_TEST:
                self._execute_integration_test_job(job)
            elif job.stage == DeploymentStage.APPROVAL:
                self._execute_approval_job(job)
            elif job.stage == DeploymentStage.DEPLOY_PRODUCTION:
                self._execute_deploy_production_job(job)
            elif job.stage == DeploymentStage.HEALTH_CHECK:
                self._execute_health_check_job(job)
            
            # Calculate duration
            job.completed_at = datetime.now()
            job.duration = (job.completed_at - job.started_at).total_seconds()
            
            # Queue next job if successful
            if job.status == DeploymentStatus.SUCCESS:
                self._queue_next_job(job)
            
            logger.info(f"Job completed: {job.id} - {job.stage.value} - {job.status.value}")
        
        except Exception as e:
            job.status = DeploymentStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.now()
            job.duration = (job.completed_at - job.started_at).total_seconds()
            
            logger.error(f"Job failed: {job.id} - {e}")
            
            # Handle pipeline failure
            self._handle_job_failure(job)
    
    def _execute_build_job(self, job: DeploymentJob):
        """Execute build job."""
        try:
            pipeline = self.pipelines[job.pipeline_id]
            config = pipeline.config.build_config
            
            job.logs.append("Starting build process...")
            
            # Simulate build process
            time.sleep(5)
            
            # Create build artifact
            artifact = BuildArtifact(
                name=f"{config.app_name}-build",
                version=pipeline.config.version,
                type="docker",
                path=f"/tmp/{config.app_name}-build.tar",
                checksum=hashlib.md5(f"build-{job.id}".encode()).hexdigest(),
                size=1024 * 1024 * 100,  # 100MB
                created_at=datetime.now(),
                metadata={
                    "dockerfile": config.get("dockerfile", "Dockerfile"),
                    "build_args": config.get("build_args", {}),
                    "environment": pipeline.environment.value
                }
            )
            
            job.artifacts.append(artifact)
            job.logs.append(f"Build completed successfully: {artifact.name}")
            job.status = DeploymentStatus.SUCCESS
        
        except Exception as e:
            job.status = DeploymentStatus.FAILED
            job.error_message = str(e)
            job.logs.append(f"Build failed: {e}")
            raise
    
    def _execute_test_job(self, job: DeploymentJob):
        """Execute test job."""
        try:
            pipeline = self.pipelines[job.pipeline_id]
            config = pipeline.config.test_config
            
            job.logs.append("Starting test process...")
            
            # Run unit tests
            if config.get("run_unit_tests", True):
                job.logs.append("Running unit tests...")
                time.sleep(3)  # Simulate test execution
                job.logs.append("Unit tests passed")
            
            # Run integration tests
            if config.get("run_integration_tests", False):
                job.logs.append("Running integration tests...")
                time.sleep(5)  # Simulate test execution
                job.logs.append("Integration tests passed")
            
            # Run performance tests
            if config.get("run_performance_tests", False):
                job.logs.append("Running performance tests...")
                time.sleep(4)  # Simulate test execution
                job.logs.append("Performance tests passed")
            
            # Check coverage
            coverage_threshold = config.get("coverage_threshold", 80)
            coverage = 85 + (pipeline.environment.value == "production") * 5  # Simulate coverage
            
            job.logs.append(f"Code coverage: {coverage}% (threshold: {coverage_threshold}%)")
            
            if coverage >= coverage_threshold:
                job.status = DeploymentStatus.SUCCESS
                job.logs.append("All tests passed successfully")
            else:
                job.status = DeploymentStatus.FAILED
                job.error_message = f"Coverage below threshold: {coverage}% < {coverage_threshold}%"
                job.logs.append(f"Coverage below threshold: {coverage}% < {coverage_threshold}%")
        
        except Exception as e:
            job.status = DeploymentStatus.FAILED
            job.error_message = str(e)
            job.logs.append(f"Test execution failed: {e}")
            raise
    
    def _execute_security_job(self, job: DeploymentJob):
        """Execute security scan job."""
        try:
            pipeline = self.pipelines[job.pipeline_id]
            config = pipeline.config.security_config
            
            job.logs.append("Starting security scan...")
            
            if config.get("run_security_scan", True):
                # Simulate security scan
                time.sleep(6)
                
                # Check for vulnerabilities
                vulnerability_threshold = config.get("vulnerability_threshold", "low")
                vulnerabilities = {
                    "critical": 0,
                    "high": 1,
                    "medium": 2,
                    "low": 5
                }
                
                job.logs.append(f"Security scan completed:")
                for severity, count in vulnerabilities.items():
                    job.logs.append(f"  {severity}: {count} vulnerabilities")
                
                # Check if vulnerabilities exceed threshold
                if vulnerability_threshold == "none" and sum(vulnerabilities.values()) > 0:
                    job.status = DeploymentStatus.FAILED
                    job.error_message = "Security vulnerabilities found"
                elif vulnerability_threshold == "low" and (vulnerabilities["critical"] + vulnerabilities["high"] + vulnerabilities["medium"]) > 0:
                    job.status = DeploymentStatus.FAILED
                    job.error_message = "Medium or higher vulnerabilities found"
                elif vulnerability_threshold == "medium" and (vulnerabilities["critical"] + vulnerabilities["high"]) > 0:
                    job.status = DeploymentStatus.FAILED
                    job.error_message = "High or critical vulnerabilities found"
                else:
                    job.status = DeploymentStatus.SUCCESS
                    job.logs.append("Security scan passed")
            else:
                job.status = DeploymentStatus.SUCCESS
                job.logs.append("Security scan skipped")
        
        except Exception as e:
            job.status = DeploymentStatus.FAILED
            job.error_message = str(e)
            job.logs.append(f"Security scan failed: {e}")
            raise
    
    def _execute_package_job(self, job: DeploymentJob):
        """Execute packaging job."""
        try:
            pipeline = self.pipelines[job.pipeline_id]
            
            job.logs.append("Starting packaging process...")
            
            # Get build artifact
            build_artifact = None
            for prev_job in pipeline.jobs:
                if prev_job.stage == DeploymentStage.BUILD and prev_job.status == DeploymentStatus.SUCCESS:
                    build_artifact = prev_job.artifacts[0] if prev_job.artifacts else None
                    break
            
            if not build_artifact:
                raise ValueError("No build artifact found")
            
            # Create deployment package
            package_artifact = BuildArtifact(
                name=f"{pipeline.config.app_name}-package",
                version=pipeline.config.version,
                type="zip",
                path=f"/tmp/{pipeline.config.app_name}-package.zip",
                checksum=hashlib.md5(f"package-{job.id}".encode()).hexdigest(),
                size=1024 * 1024 * 150,  # 150MB
                created_at=datetime.now(),
                metadata={
                    "build_artifact": build_artifact.name,
                    "environment": pipeline.environment.value,
                    "deployment_config": pipeline.config.deploy_config
                }
            )
            
            job.artifacts.append(package_artifact)
            job.logs.append(f"Package created successfully: {package_artifact.name}")
            job.status = DeploymentStatus.SUCCESS
        
        except Exception as e:
            job.status = DeploymentStatus.FAILED
            job.error_message = str(e)
            job.logs.append(f"Packaging failed: {e}")
            raise
    
    def _execute_deploy_staging_job(self, job: DeploymentJob):
        """Execute staging deployment job."""
        try:
            pipeline = self.pipelines[job.pipeline_id]
            config = pipeline.config.deploy_config
            
            job.logs.append("Starting staging deployment...")
            
            # Get package artifact
            package_artifact = None
            for prev_job in pipeline.jobs:
                if prev_job.stage == DeploymentStage.PACKAGE and prev_job.status == DeploymentStatus.SUCCESS:
                    package_artifact = prev_job.artifacts[0] if prev_job.artifacts else None
                    break
            
            if not package_artifact:
                raise ValueError("No package artifact found")
            
            # Simulate deployment
            strategy = config.get("strategy", "rolling")
            replicas = config.get("replicas", 2)
            
            job.logs.append(f"Deployment strategy: {strategy}")
            job.logs.append(f"Replicas: {replicas}")
            
            time.sleep(8)  # Simulate deployment time
            
            job.logs.append("Staging deployment completed successfully")
            job.status = DeploymentStatus.SUCCESS
        
        except Exception as e:
            job.status = DeploymentStatus.FAILED
            job.error_message = str(e)
            job.logs.append(f"Staging deployment failed: {e}")
            raise
    
    def _execute_integration_test_job(self, job: DeploymentJob):
        """Execute integration test job."""
        try:
            job.logs.append("Starting integration tests...")
            
            # Simulate integration tests
            time.sleep(7)
            
            job.logs.append("Running API integration tests...")
            job.logs.append("Running database integration tests...")
            job.logs.append("Running ML service integration tests...")
            
            job.logs.append("Integration tests passed")
            job.status = DeploymentStatus.SUCCESS
        
        except Exception as e:
            job.status = DeploymentStatus.FAILED
            job.error_message = str(e)
            job.logs.append(f"Integration tests failed: {e}")
            raise
    
    def _execute_approval_job(self, job: DeploymentJob):
        """Execute approval job."""
        try:
            job.logs.append("Waiting for manual approval...")
            
            # Simulate approval process
            # In real implementation, this would wait for human approval
            time.sleep(2)
            
            # Auto-approve for demo purposes
            job.logs.append("Approval granted")
            job.status = DeploymentStatus.SUCCESS
        
        except Exception as e:
            job.status = DeploymentStatus.FAILED
            job.error_message = str(e)
            job.logs.append(f"Approval process failed: {e}")
            raise
    
    def _execute_deploy_production_job(self, job: DeploymentJob):
        """Execute production deployment job."""
        try:
            pipeline = self.pipelines[job.pipeline_id]
            config = pipeline.config.deploy_config
            
            job.logs.append("Starting production deployment...")
            
            # Get package artifact
            package_artifact = None
            for prev_job in pipeline.jobs:
                if prev_job.stage == DeploymentStage.PACKAGE and prev_job.status == DeploymentStatus.SUCCESS:
                    package_artifact = prev_job.artifacts[0] if prev_job.artifacts else None
                    break
            
            if not package_artifact:
                raise ValueError("No package artifact found")
            
            # Simulate production deployment
            strategy = config.get("strategy", "blue_green")
            replicas = config.get("replicas", 3)
            canary = config.get("canary", False)
            canary_percentage = config.get("canary_percentage", 10)
            
            job.logs.append(f"Deployment strategy: {strategy}")
            job.logs.append(f"Replicas: {replicas}")
            
            if canary:
                job.logs.append(f"Canary deployment: {canary_percentage}%")
            
            time.sleep(10)  # Simulate deployment time
            
            job.logs.append("Production deployment completed successfully")
            job.status = DeploymentStatus.SUCCESS
        
        except Exception as e:
            job.status = DeploymentStatus.FAILED
            job.error_message = str(e)
            job.logs.append(f"Production deployment failed: {e}")
            raise
    
    def _execute_health_check_job(self, job: DeploymentJob):
        """Execute health check job."""
        try:
            job.logs.append("Starting health checks...")
            
            # Simulate health checks
            health_checks = [
                ("API Health Check", True),
                ("Database Health Check", True),
                ("Cache Health Check", True),
                ("ML Service Health Check", True),
                ("Load Balancer Health Check", True)
            ]
            
            for check_name, result in health_checks:
                job.logs.append(f"Running {check_name}...")
                time.sleep(1)
                
                if result:
                    job.logs.append(f"{check_name}: PASSED")
                else:
                    job.logs.append(f"{check_name}: FAILED")
                    raise Exception(f"{check_name} failed")
            
            job.logs.append("All health checks passed")
            job.status = DeploymentStatus.SUCCESS
        
        except Exception as e:
            job.status = DeploymentStatus.FAILED
            job.error_message = str(e)
            job.logs.append(f"Health checks failed: {e}")
            raise
    
    def _queue_next_job(self, completed_job: DeploymentJob):
        """Queue the next job in the pipeline."""
        try:
            pipeline = self.pipelines[completed_job.pipeline_id]
            
            # Find the next job
            current_index = next((i for i, job in enumerate(pipeline.jobs) if job.id == completed_job.id), -1)
            
            if current_index >= 0 and current_index + 1 < len(pipeline.jobs):
                next_job = pipeline.jobs[current_index + 1]
                self.jobs_queue.put(next_job)
                logger.info(f"Queued next job: {next_job.id}")
        
        except Exception as e:
            logger.error(f"Error queuing next job: {e}")
    
    def _handle_job_failure(self, failed_job: DeploymentJob):
        """Handle job failure and potentially rollback."""
        try:
            pipeline = self.pipelines[failed_job.pipeline_id]
            
            # Mark pipeline as failed
            pipeline.status = DeploymentStatus.FAILED
            pipeline.completed_at = datetime.now()
            
            # Update metrics
            self.metrics.failed_pipelines += 1
            
            # Send failure notification
            self._send_pipeline_notification(pipeline, failed_job)
            
            # Check if rollback is needed
            if failed_job.stage in [DeploymentStage.DEPLOY_STAGING, DeploymentStage.DEPLOY_PRODUCTION]:
                self._trigger_rollback(pipeline, failed_job)
            
            logger.error(f"Pipeline failed: {pipeline.id} - {failed_job.error_message}")
        
        except Exception as e:
            logger.error(f"Error handling job failure: {e}")
    
    def _trigger_rollback(self, pipeline: DeploymentPipeline, failed_job: DeploymentJob):
        """Trigger rollback for failed deployment."""
        try:
            rollback_job = DeploymentJob(
                id=f"{pipeline.id}_rollback",
                pipeline_id=pipeline.id,
                stage=DeploymentStage.ROLLBACK,
                status=DeploymentStatus.PENDING,
                started_at=datetime.now()
            )
            
            pipeline.jobs.append(rollback_job)
            self.jobs_queue.put(rollback_job)
            
            logger.info(f"Rollback triggered for pipeline: {pipeline.id}")
        
        except Exception as e:
            logger.error(f"Error triggering rollback: {e}")
    
    def _send_pipeline_notification(self, pipeline: DeploymentPipeline, failed_job: Optional[DeploymentJob] = None):
        """Send pipeline notification."""
        try:
            config = pipeline.config.notification_config
            
            # Determine if notification should be sent
            should_notify = False
            
            if pipeline.status == DeploymentStatus.SUCCESS and config.get("on_success", False):
                should_notify = True
            elif pipeline.status == DeploymentStatus.FAILED and config.get("on_failure", True):
                should_notify = True
            
            if should_notify:
                channels = config.get("channels", ["email"])
                
                for channel in channels:
                    self.notification_executor.submit(self._send_notification, pipeline, channel, failed_job)
        
        except Exception as e:
            logger.error(f"Error sending pipeline notification: {e}")
    
    def _send_notification(self, pipeline: DeploymentPipeline, channel: str, failed_job: Optional[DeploymentJob] = None):
        """Send notification through specified channel."""
        try:
            if channel == "email":
                self._send_email_notification(pipeline, failed_job)
            elif channel == "slack":
                self._send_slack_notification(pipeline, failed_job)
            elif channel == "sms":
                self._send_sms_notification(pipeline, failed_job)
            
            logger.info(f"Notification sent via {channel} for pipeline: {pipeline.id}")
        
        except Exception as e:
            logger.error(f"Error sending notification via {channel}: {e}")
    
    def _send_email_notification(self, pipeline: DeploymentPipeline, failed_job: Optional[DeploymentJob] = None):
        """Send email notification."""
        try:
            status_icon = "✅" if pipeline.status == DeploymentStatus.SUCCESS else "❌"
            subject = f"{status_icon} Pipeline {pipeline.status.value.upper()}: {pipeline.name}"
            
            body = f"""
Pipeline: {pipeline.name}
Status: {pipeline.status.value}
Environment: {pipeline.environment.value}
Trigger: {pipeline.trigger.value}
Started: {pipeline.started_at}
Completed: {pipeline.completed_at}
Duration: {{(pipeline.completed_at - pipeline.started_at).total_seconds():.2f}}s if pipeline.completed_at else 'N/A'

"""
            
            if failed_job:
                body += f"Failed Stage: {failed_job.stage.value}\n"
                body += f"Error: {failed_job.error_message}\n\n"
            
            body += "Job Results:\n"
            for job in pipeline.jobs:
                job_icon = "✅" if job.status == DeploymentStatus.SUCCESS else "❌" if job.status == DeploymentStatus.FAILED else "⏳"
                body += f"{job_icon} {job.stage.value}: {job.status.value} ({job.duration:.2f}s)\n"
            
            # Simulate email sending
            logger.info(f"Email notification sent for pipeline: {pipeline.id}")
        
        except Exception as e:
            logger.error(f"Error sending email notification: {e}")
    
    def _send_slack_notification(self, pipeline: DeploymentPipeline, failed_job: Optional[DeploymentJob] = None):
        """Send Slack notification."""
        try:
            color = "good" if pipeline.status == DeploymentStatus.SUCCESS else "danger"
            status_text = "Success" if pipeline.status == DeploymentStatus.SUCCESS else "Failed"
            
            payload = {
                "attachments": [{
                    "color": color,
                    "title": f"Pipeline {status_text}: {pipeline.name}",
                    "fields": [
                        {"title": "Environment", "value": pipeline.environment.value, "short": True},
                        {"title": "Status", "value": pipeline.status.value, "short": True},
                        {"title": "Trigger", "value": pipeline.trigger.value, "short": True},
                        {"title": "Duration", "value": f"{(pipeline.completed_at - pipeline.started_at).total_seconds():.2f}s" if pipeline.completed_at else "N/A", "short": True}
                    ]
                }]
            }
            
            if failed_job:
                payload["attachments"][0]["fields"].append({
                    "title": "Failed Stage",
                    "value": failed_job.stage.value,
                    "short": True
                })
            
            # Simulate Slack notification
            logger.info(f"Slack notification sent for pipeline: {pipeline.id}")
        
        except Exception as e:
            logger.error(f"Error sending Slack notification: {e}")
    
    def _send_sms_notification(self, pipeline: DeploymentPipeline, failed_job: Optional[DeploymentJob] = None):
        """Send SMS notification."""
        try:
            message = f"Pipeline {pipeline.status.value}: {pipeline.name} ({pipeline.environment.value})"
            
            # Simulate SMS sending
            logger.info(f"SMS notification sent for pipeline: {pipeline.id}")
        
        except Exception as e:
            logger.error(f"Error sending SMS notification: {e}")
    
    def _check_pipeline_status(self):
        """Check and update pipeline status."""
        try:
            for pipeline in self.pipelines.values():
                if pipeline.status == DeploymentStatus.RUNNING:
                    # Check if all jobs are completed
                    all_completed = all(job.status in [DeploymentStatus.SUCCESS, DeploymentStatus.FAILED] for job in pipeline.jobs)
                    
                    if all_completed:
                        # Check if any job failed
                        any_failed = any(job.status == DeploymentStatus.FAILED for job in pipeline.jobs)
                        
                        if any_failed:
                            pipeline.status = DeploymentStatus.FAILED
                            self.metrics.failed_pipelines += 1
                        else:
                            pipeline.status = DeploymentStatus.SUCCESS
                            self.metrics.successful_pipelines += 1
                        
                        pipeline.completed_at = datetime.now()
                        
                        # Send notification
                        self._send_pipeline_notification(pipeline)
        
        except Exception as e:
            logger.error(f"Error checking pipeline status: {e}")
    
    def _cleanup_old_pipelines(self):
        """Clean up old pipelines to prevent memory issues."""
        try:
            cutoff_time = datetime.now() - timedelta(days=7)
            
            old_pipeline_ids = [
                pipeline_id for pipeline_id, pipeline in self.pipelines.items()
                if pipeline.created_at < cutoff_time
            ]
            
            for pipeline_id in old_pipeline_ids:
                del self.pipelines[pipeline_id]
            
            if old_pipeline_ids:
                logger.info(f"Cleaned up {len(old_pipeline_ids)} old pipelines")
        
        except Exception as e:
            logger.error(f"Error cleaning up old pipelines: {e}")
    
    def _trigger_scheduled_pipeline(self, environment: Environment):
        """Trigger scheduled pipeline."""
        try:
            if self.running:
                self.trigger_pipeline(
                    environment=environment,
                    trigger=PipelineTrigger.SCHEDULED,
                    triggered_by="scheduler"
                )
        
        except Exception as e:
            logger.error(f"Error triggering scheduled pipeline: {e}")
    
    def _run_health_checks(self):
        """Run system health checks."""
        try:
            # Simulate health checks
            logger.info("Running system health checks...")
            
            cpu_percent = psutil.cpu_percent(interval=1)
            memory_percent = psutil.virtual_memory().percent
            
            logger.info(f"CPU: {cpu_percent}%, Memory: {memory_percent}%")
            
            if cpu_percent > 90 or memory_percent > 90:
                logger.warning("High resource usage detected")
        
        except Exception as e:
            logger.error(f"Error running health checks: {e}")
    
    def _apply_config_override(self, config: DeploymentConfig, override: Dict[str, Any]) -> DeploymentConfig:
        """Apply configuration override."""
        try:
            # Create a copy of the config
            new_config = DeploymentConfig(
                environment=config.environment,
                app_name=config.app_name,
                version=config.version,
                build_config=config.build_config.copy(),
                test_config=config.test_config.copy(),
                security_config=config.security_config.copy(),
                deploy_config=config.deploy_config.copy(),
                rollback_config=config.rollback_config.copy(),
                notification_config=config.notification_config.copy()
            )
            
            # Apply overrides
            if "build_config" in override:
                new_config.build_config.update(override["build_config"])
            
            if "test_config" in override:
                new_config.test_config.update(override["test_config"])
            
            if "security_config" in override:
                new_config.security_config.update(override["security_config"])
            
            if "deploy_config" in override:
                new_config.deploy_config.update(override["deploy_config"])
            
            if "rollback_config" in override:
                new_config.rollback_config.update(override["rollback_config"])
            
            if "notification_config" in override:
                new_config.notification_config.update(override["notification_config"])
            
            return new_config
        
        except Exception as e:
            logger.error(f"Error applying config override: {e}")
            return config
    
    def get_pipeline_status(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """Get pipeline status."""
        try:
            pipeline = self.pipelines.get(pipeline_id)
            if not pipeline:
                return None
            
            return {
                "id": pipeline.id,
                "name": pipeline.name,
                "trigger": pipeline.trigger.value,
                "environment": pipeline.environment.value,
                "status": pipeline.status.value,
                "created_at": pipeline.created_at.isoformat(),
                "started_at": pipeline.started_at.isoformat() if pipeline.started_at else None,
                "completed_at": pipeline.completed_at.isoformat() if pipeline.completed_at else None,
                "duration": (pipeline.completed_at - pipeline.started_at).total_seconds() if pipeline.completed_at and pipeline.started_at else None,
                "jobs": [
                    {
                        "id": job.id,
                        "stage": job.stage.value,
                        "status": job.status.value,
                        "started_at": job.started_at.isoformat(),
                        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                        "duration": job.duration,
                        "error_message": job.error_message
                    }
                    for job in pipeline.jobs
                ],
                "config": {
                    "app_name": pipeline.config.app_name,
                    "version": pipeline.config.version,
                    "build_config": pipeline.config.build_config,
                    "test_config": pipeline.config.test_config,
                    "deploy_config": pipeline.config.deploy_config
                }
            }
        
        except Exception as e:
            logger.error(f"Error getting pipeline status: {e}")
            return None
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get system metrics."""
        try:
            # Update metrics
            self._update_metrics()
            
            return {
                "total_pipelines": self.metrics.total_pipelines,
                "successful_pipelines": self.metrics.successful_pipelines,
                "failed_pipelines": self.metrics.failed_pipelines,
                "cancelled_pipelines": self.metrics.cancelled_pipelines,
                "avg_duration": self.metrics.avg_duration,
                "success_rate": self.metrics.success_rate,
                "deployment_frequency": self.metrics.deployment_frequency,
                "lead_time": self.metrics.lead_time,
                "mttr": self.metrics.mttr,
                "change_failure_rate": self.metrics.change_failure_rate,
                "active_pipelines": len([p for p in self.pipelines.values() if p.status == DeploymentStatus.RUNNING]),
                "pending_jobs": self.jobs_queue.qsize(),
                "uptime": time.time() - self.start_time
            }
        
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {}
    
    def _update_metrics(self):
        """Update system metrics."""
        try:
            if self.metrics.total_pipelines > 0:
                self.metrics.success_rate = (self.metrics.successful_pipelines / self.metrics.total_pipelines) * 100
            
            # Calculate average duration
            completed_pipelines = [p for p in self.pipelines.values() if p.completed_at and p.started_at]
            if completed_pipelines:
                durations = [(p.completed_at - p.started_at).total_seconds() for p in completed_pipelines]
                self.metrics.avg_duration = statistics.mean(durations)
            
            # Calculate deployment frequency (deployments per day)
            last_24_hours = datetime.now() - timedelta(hours=24)
            recent_deployments = len([p for p in self.pipelines.values() if p.created_at > last_24_hours])
            self.metrics.deployment_frequency = recent_deployments
            
            # Calculate change failure rate
            if self.metrics.total_pipelines > 0:
                self.metrics.change_failure_rate = (self.metrics.failed_pipelines / self.metrics.total_pipelines) * 100
        
        except Exception as e:
            logger.error(f"Error updating metrics: {e}")

def main():
    """Main function for the CI/CD pipeline system."""
    print("🚀 Starting Automated Deployment & CI/CD Pipeline System...")
    print("=" * 80)
    
    # Create CI/CD system
    cicd_system = AutomatedCICDPipeline()
    
    try:
        # Start system
        cicd_system.start_pipeline_system()
        
        print("✅ Automated CI/CD pipeline system started successfully!")
        print(f"📊 Total pipelines: {cicd_system.metrics.total_pipelines}")
        print(f"🔧 Active pipelines: {len([p for p in cicd_system.pipelines.values() if p.status == DeploymentStatus.RUNNING])}")
        
        # Trigger example pipelines
        print("\n🚀 Triggering example pipelines...")
        
        # Development deployment
        dev_pipeline_id = cicd_system.trigger_pipeline(
            environment=Environment.DEVELOPMENT,
            trigger=PipelineTrigger.MANUAL,
            triggered_by="demo"
        )
        print(f"📦 Development pipeline triggered: {dev_pipeline_id}")
        
        # Staging deployment
        staging_pipeline_id = cicd_system.trigger_pipeline(
            environment=Environment.STAGING,
            trigger=PipelineTrigger.MANUAL,
            triggered_by="demo"
        )
        print(f"📦 Staging pipeline triggered: {staging_pipeline_id}")
        
        # Display status every 15 seconds
        while True:
            time.sleep(15)
            
            metrics = cicd_system.get_system_metrics()
            
            print(f"\n📊 CI/CD System Status (Uptime: {metrics['uptime']:.0f}s):")
            print("=" * 80)
            print(f"📦 Total Pipelines: {metrics['total_pipelines']}")
            print(f"✅ Successful: {metrics['successful_pipelines']}")
            print(f"❌ Failed: {metrics['failed_pipelines']}")
            print(f"📈 Success Rate: {metrics['success_rate']:.1f}%")
            print(f"⏱️  Avg Duration: {metrics['avg_duration']:.2f}s")
            print(f"🔄 Deployment Frequency: {metrics['deployment_frequency']}/day")
            print(f"🔧 Active Pipelines: {metrics['active_pipelines']}")
            print(f"⏳ Pending Jobs: {metrics['pending_jobs']}")
            
            # Display recent pipelines
            recent_pipelines = sorted(
                cicd_system.pipelines.values(),
                key=lambda p: p.created_at,
                reverse=True
            )[:5]
            
            if recent_pipelines:
                print(f"\n📋 Recent Pipelines:")
                print("=" * 80)
                for pipeline in recent_pipelines:
                    status_icon = {
                        DeploymentStatus.SUCCESS: "✅",
                        DeploymentStatus.FAILED: "❌",
                        DeploymentStatus.RUNNING: "🔄",
                        DeploymentStatus.PENDING: "⏳"
                    }.get(pipeline.status, "📢")
                    
                    duration = ""
                    if pipeline.completed_at and pipeline.started_at:
                        duration = f" ({(pipeline.completed_at - pipeline.started_at).total_seconds():.1f}s)"
                    
                    print(f"{status_icon} {pipeline.name}: {pipeline.status.value}{duration}")
            
            # System assessment
            if metrics['success_rate'] >= 95:
                print(f"\n🌟 CI/CD Health: EXCELLENT ({metrics['success_rate']:.1f}% success rate)")
            elif metrics['success_rate'] >= 85:
                print(f"\n✅ CI/CD Health: GOOD ({metrics['success_rate']:.1f}% success rate)")
            elif metrics['success_rate'] >= 70:
                print(f"\n⚠️  CI/CD Health: FAIR ({metrics['success_rate']:.1f}% success rate)")
            else:
                print(f"\n❌ CI/CD Health: POOR ({metrics['success_rate']:.1f}% success rate)")
    
    except KeyboardInterrupt:
        print("\n🛑 Stopping CI/CD pipeline system...")
        cicd_system.stop_pipeline_system()
        print("✅ CI/CD pipeline system stopped")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        cicd_system.stop_pipeline_system()

if __name__ == '__main__':
    main()
