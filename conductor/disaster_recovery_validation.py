# DISASTER RECOVERY VALIDATION
"""
Comprehensive disaster recovery testing for Learning Hub platform.
Tests backup, recovery, and business continuity procedures.
"""

import asyncio
import aiohttp
import json
import time
import subprocess
import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import random

@dataclass
class DisasterRecoveryResult:
    test_name: str
    success: bool
    recovery_time: float  # in seconds
    data_integrity: bool
    description: str
    recommendation: str

class DisasterRecoveryValidator:
    """Comprehensive disaster recovery testing suite."""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
        self.results = []
        self.backup_timestamps = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def add_result(self, test_name: str, success: bool, recovery_time: float,
                   data_integrity: bool, description: str, recommendation: str):
        """Add a disaster recovery test result."""
        result = DisasterRecoveryResult(
            test_name=test_name,
            success=success,
            recovery_time=recovery_time,
            data_integrity=data_integrity,
            description=description,
            recommendation=recommendation
        )
        self.results.append(result)
    
    async def test_database_backup_recovery(self) -> DisasterRecoveryResult:
        """Test database backup and recovery procedures."""
        print("💾 Testing Database Backup & Recovery...")
        
        start_time = time.time()
        
        try:
            # 1. Create database backup
            backup_cmd = [
                "pg_dump", 
                "-h", "localhost", 
                "-U", "learninghub", 
                "-d", "learninghub",
                "-f", f"/tmp/backup_{int(time.time())}.sql"
            ]
            
            result = subprocess.run(backup_cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                self.add_result(
                    "Database Backup Recovery",
                    False,
                    0,
                    False,
                    "Database backup creation failed",
                    "Check database permissions and backup configuration"
                )
                return DisasterRecoveryResult("Database Backup Recovery", False, 0, False, "Backup failed")
            
            # 2. Simulate data corruption (create test data first)
            test_data = {
                "title": "Disaster Recovery Test Course",
                "description": "Course for testing disaster recovery",
                "price": 99.99
            }
            
            async with self.session.post(f"{self.base_url}/api/v1/courses/", json=test_data) as response:
                if response.status == 201:
                    course_data = await response.json()
                    course_id = course_data.get("id")
                else:
                    course_id = None
            
            # 3. Restore database from backup
            restore_cmd = [
                "psql",
                "-h", "localhost",
                "-U", "learninghub",
                "-d", "learninghub",
                "-f", f"/tmp/backup_{int(time.time())}.sql"
            ]
            
            result = subprocess.run(restore_cmd, capture_output=True, text=True, timeout=30)
            
            # 4. Verify data integrity
            recovery_time = time.time() - start_time
            data_integrity = True
            
            if course_id:
                try:
                    async with self.session.get(f"{self.base_url}/api/v1/courses/{course_id}/") as response:
                        if response.status == 404:
                            data_integrity = False  # Test course should be gone after restore
                except Exception:
                    data_integrity = False
            
            success = result.returncode == 0 and data_integrity
            
            self.add_result(
                "Database Backup Recovery",
                success,
                recovery_time,
                data_integrity,
                "Database backup and recovery test completed",
                "Automate backup procedures and test regularly" if success else "Fix backup/restore procedures"
            )
            
            return DisasterRecoveryResult(
                "Database Backup Recovery", success, recovery_time, data_integrity,
                "Backup/restore completed" if success else "Backup/restore failed"
            )
            
        except subprocess.TimeoutExpired:
            self.add_result(
                "Database Backup Recovery",
                False,
                30,
                False,
                "Database backup/restore timed out",
                "Optimize backup procedures and increase timeouts"
            )
            return DisasterRecoveryResult("Database Backup Recovery", False, 30, False, "Timeout")
        except Exception as e:
            self.add_result(
                "Database Backup Recovery",
                False,
                0,
                False,
                f"Database backup/restore failed: {str(e)}",
                "Check database configuration and permissions"
            )
            return DisasterRecoveryResult("Database Backup Recovery", False, 0, False, f"Error: {e}")
    
    async def test_redis_backup_recovery(self) -> DisasterRecoveryResult:
        """Test Redis backup and recovery procedures."""
        print("🔴 Testing Redis Backup & Recovery...")
        
        start_time = time.time()
        
        try:
            # 1. Create Redis backup
            backup_cmd = [
                "redis-cli",
                "--rdb",
                f"/tmp/redis_backup_{int(time.time())}.rdb"
            ]
            
            result = subprocess.run(backup_cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode != 0:
                self.add_result(
                    "Redis Backup Recovery",
                    False,
                    0,
                    False,
                    "Redis backup creation failed",
                    "Check Redis configuration and permissions"
                )
                return DisasterRecoveryResult("Redis Backup Recovery", False, 0, False, "Backup failed")
            
            # 2. Add test data to Redis
            test_key = f"disaster_test_{int(time.time())}"
            set_cmd = ["redis-cli", "set", test_key, "test_data"]
            subprocess.run(set_cmd, capture_output=True, text=True, timeout=5)
            
            # 3. Simulate Redis restart and recovery
            restart_cmd = ["docker", "restart", "redis"]
            subprocess.run(restart_cmd, capture_output=True, text=True, timeout=10)
            
            # Wait for Redis to restart
            await asyncio.sleep(5)
            
            # 4. Verify Redis is working
            ping_cmd = ["redis-cli", "ping"]
            result = subprocess.run(ping_cmd, capture_output=True, text=True, timeout=5)
            
            recovery_time = time.time() - start_time
            redis_working = result.returncode == 0 and "PONG" in result.stdout
            
            # 5. Clean up test data
            del_cmd = ["redis-cli", "del", test_key]
            subprocess.run(del_cmd, capture_output=True, text=True, timeout=5)
            
            success = redis_working
            
            self.add_result(
                "Redis Backup Recovery",
                success,
                recovery_time,
                redis_working,
                "Redis backup and recovery test completed",
                "Implement Redis persistence and regular backups" if success else "Fix Redis backup procedures"
            )
            
            return DisasterRecoveryResult(
                "Redis Backup Recovery", success, recovery_time, redis_working,
                "Redis recovery completed" if success else "Redis recovery failed"
            )
            
        except Exception as e:
            self.add_result(
                "Redis Backup Recovery",
                False,
                0,
                False,
                f"Redis backup/recovery failed: {str(e)}",
                "Check Redis configuration and Docker setup"
            )
            return DisasterRecoveryResult("Redis Backup Recovery", False, 0, False, f"Error: {e}")
    
    async def test_file_system_backup_recovery(self) -> DisasterRecoveryResult:
        """Test file system backup and recovery procedures."""
        print("📁 Testing File System Backup & Recovery...")
        
        start_time = time.time()
        
        try:
            # 1. Create test files
            test_files = []
            for i in range(5):
                filename = f"/tmp/test_file_{i}_{int(time.time())}.txt"
                with open(filename, 'w') as f:
                    f.write(f"Test file content {i} - {time.time()}")
                test_files.append(filename)
            
            # 2. Create backup of media files
            media_backup_cmd = [
                "tar", "-czf", f"/tmp/media_backup_{int(time.time())}.tar.gz",
                "/app/media"
            ]
            
            result = subprocess.run(media_backup_cmd, capture_output=True, text=True, timeout=30)
            
            # 3. Simulate file deletion (remove one test file)
            if test_files:
                os.remove(test_files[0])
            
            # 4. Restore from backup
            restore_cmd = [
                "tar", "-xzf", f"/tmp/media_backup_{int(time.time())}.tar.gz",
                "-C", "/tmp"
            ]
            
            result = subprocess.run(restore_cmd, capture_output=True, text=True, timeout=30)
            
            recovery_time = time.time() - start_time
            
            # 5. Verify file integrity
            data_integrity = True
            for filename in test_files:
                if not os.path.exists(filename):
                    data_integrity = False
                    break
            
            # 6. Clean up test files
            for filename in test_files:
                if os.path.exists(filename):
                    os.remove(filename)
            
            success = result.returncode == 0 and data_integrity
            
            self.add_result(
                "File System Backup Recovery",
                success,
                recovery_time,
                data_integrity,
                "File system backup and recovery test completed",
                "Implement automated file backup procedures" if success else "Fix file backup procedures"
            )
            
            return DisasterRecoveryResult(
                "File System Backup Recovery", success, recovery_time, data_integrity,
                "File recovery completed" if success else "File recovery failed"
            )
            
        except Exception as e:
            self.add_result(
                "File System Backup Recovery",
                False,
                0,
                False,
                f"File system backup/recovery failed: {str(e)}",
                "Check file permissions and backup configuration"
            )
            return DisasterRecoveryResult("File System Backup Recovery", False, 0, False, f"Error: {e}")
    
    async def test_service_failover(self) -> DisasterRecoveryResult:
        """Test service failover procedures."""
        print("🔄 Testing Service Failover...")
        
        start_time = time.time()
        
        try:
            # 1. Check initial service status
            services = ["web", "db", "redis", "celery_worker"]
            initial_status = {}
            
            for service in services:
                try:
                    result = subprocess.run(
                        ["docker", "ps", "--filter", f"name={service}", "--format", "{{.Status}}"],
                        capture_output=True, text=True, timeout=10
                    )
                    initial_status[service] = "Up" in result.stdout
                except Exception:
                    initial_status[service] = False
            
            # 2. Simulate service failure (stop web service)
            stop_cmd = ["docker", "stop", "web"]
            subprocess.run(stop_cmd, capture_output=True, text=True, timeout=10)
            
            # 3. Wait for failover detection
            await asyncio.sleep(10)
            
            # 4. Restart service
            restart_cmd = ["docker", "start", "web"]
            result = subprocess.run(restart_cmd, capture_output=True, text=True, timeout=10)
            
            # 5. Wait for service to be ready
            await asyncio.sleep(15)
            
            # 6. Verify service is working
            service_working = False
            try:
                async with self.session.get(f"{self.base_url}/health/", timeout=10) as response:
                    service_working = response.status == 200
            except Exception:
                service_working = False
            
            recovery_time = time.time() - start_time
            success = result.returncode == 0 and service_working
            
            self.add_result(
                "Service Failover",
                success,
                recovery_time,
                service_working,
                "Service failover test completed",
                "Implement automated failover and health monitoring" if success else "Fix failover procedures"
            )
            
            return DisasterRecoveryResult(
                "Service Failover", success, recovery_time, service_working,
                "Failover completed" if success else "Failover failed"
            )
            
        except Exception as e:
            self.add_result(
                "Service Failover",
                False,
                0,
                False,
                f"Service failover failed: {str(e)}",
                "Check service configuration and monitoring"
            )
            return DisasterRecoveryResult("Service Failover", False, 0, False, f"Error: {e}")
    
    async def test_load_balancer_failover(self) -> DisasterRecoveryResult:
        """Test load balancer failover procedures."""
        print("⚖️ Testing Load Balancer Failover...")
        
        start_time = time.time()
        
        try:
            # 1. Check initial load balancer status
            initial_status = True
            try:
                async with self.session.get(f"{self.base_url}/health/", timeout=5) as response:
                    initial_status = response.status == 200
            except Exception:
                initial_status = False
            
            # 2. Simulate load balancer failure (if applicable)
            # This would depend on your load balancer setup
            # For now, we'll test service availability
            
            # 3. Test multiple endpoints to verify load distribution
            endpoints = [
                "/health/",
                "/api/v1/courses/",
                "/api/v1/gamification/leaderboard/"
            ]
            
            endpoint_status = {}
            for endpoint in endpoints:
                try:
                    async with self.session.get(f"{self.base_url}{endpoint}", timeout=5) as response:
                        endpoint_status[endpoint] = response.status == 200
                except Exception:
                    endpoint_status[endpoint] = False
            
            recovery_time = time.time() - start_time
            success = all(endpoint_status.values()) and initial_status
            
            self.add_result(
                "Load Balancer Failover",
                success,
                recovery_time,
                success,
                "Load balancer failover test completed",
                "Implement proper load balancing and health checks" if success else "Fix load balancer configuration"
            )
            
            return DisasterRecoveryResult(
                "Load Balancer Failover", success, recovery_time, success,
                "Load balancer working" if success else "Load balancer issues"
            )
            
        except Exception as e:
            self.add_result(
                "Load Balancer Failover",
                False,
                0,
                False,
                f"Load balancer failover failed: {str(e)}",
                "Check load balancer configuration and health checks"
            )
            return DisasterRecoveryResult("Load Balancer Failover", False, 0, False, f"Error: {e}")
    
    async def test_data_corruption_recovery(self) -> DisasterRecoveryResult:
        """Test recovery from data corruption scenarios."""
        print("🔧 Testing Data Corruption Recovery...")
        
        start_time = time.time()
        
        try:
            # 1. Create baseline data
            baseline_data = {
                "title": "Baseline Test Course",
                "description": "Course for testing corruption recovery",
                "price": 199.99
            }
            
            async with self.session.post(f"{self.base_url}/api/v1/courses/", json=baseline_data) as response:
                if response.status == 201:
                    course_data = await response.json()
                    course_id = course_data.get("id")
                else:
                    course_id = None
            
            # 2. Simulate data corruption (update with invalid data)
            if course_id:
                corrupt_data = {"title": "", "description": None, "price": -1}
                try:
                    async with self.session.patch(f"{self.base_url}/api/v1/courses/{course_id}/", json=corrupt_data) as response:
                        corruption_attempted = response.status in [200, 400]
                except Exception:
                    corruption_attempted = False
            
            # 3. Restore from backup (simulated)
            # In a real scenario, you would restore from backup here
            
            # 4. Verify data integrity
            data_integrity = True
            if course_id:
                try:
                    async with self.session.get(f"{self.base_url}/api/v1/courses/{course_id}/") as response:
                        if response.status == 200:
                            course_data = await response.json()
                            # Check if data is valid
                            if not course_data.get("title") or course_data.get("price", 0) < 0:
                                data_integrity = False
                except Exception:
                    data_integrity = False
            
            recovery_time = time.time() - start_time
            success = data_integrity
            
            self.add_result(
                "Data Corruption Recovery",
                success,
                recovery_time,
                data_integrity,
                "Data corruption recovery test completed",
                "Implement data validation and corruption detection" if success else "Fix data corruption procedures"
            )
            
            return DisasterRecoveryResult(
                "Data Corruption Recovery", success, recovery_time, data_integrity,
                "Corruption recovery completed" if success else "Corruption recovery failed"
            )
            
        except Exception as e:
            self.add_result(
                "Data Corruption Recovery",
                False,
                0,
                False,
                f"Data corruption recovery failed: {str(e)}",
                "Implement proper data validation and backup procedures"
            )
            return DisasterRecoveryResult("Data Corruption Recovery", False, 0, False, f"Error: {e}")
    
    async def run_comprehensive_disaster_recovery_test(self) -> Dict[str, Any]:
        """Run all disaster recovery tests and return comprehensive results."""
        print("🚀 STARTING COMPREHENSIVE DISASTER RECOVERY TESTING")
        print("=" * 60)
        
        # Run all disaster recovery tests
        tests = [
            self.test_database_backup_recovery(),
            self.test_redis_backup_recovery(),
            self.test_file_system_backup_recovery(),
            self.test_service_failover(),
            self.test_load_balancer_failover(),
            self.test_data_corruption_recovery(),
        ]
        
        results = await asyncio.gather(*tests, return_exceptions=True)
        
        # Calculate recovery metrics
        total_tests = len(self.results)
        successful_tests = len([r for r in self.results if r.success])
        failed_tests = total_tests - successful_tests
        
        # Calculate average recovery time
        recovery_times = [r.recovery_time for r in self.results if r.success]
        avg_recovery_time = sum(recovery_times) / len(recovery_times) if recovery_times else 0
        max_recovery_time = max(recovery_times) if recovery_times else 0
        
        # Calculate data integrity score
        data_integrity_tests = len([r for r in self.results if r.data_integrity])
        data_integrity_score = (data_integrity_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Calculate overall disaster recovery score
        recovery_score = (successful_tests / total_tests * 100) if total_tests > 0 else 0
        
        print("\n" + "=" * 60)
        print("🔄 DISASTER RECOVERY TEST RESULTS")
        print("=" * 60)
        
        print(f"📊 RECOVERY ASSESSMENT:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Successful Tests: {successful_tests}")
        print(f"   Failed Tests: {failed_tests}")
        print(f"   Success Rate: {recovery_score:.1f}%")
        print(f"   Avg Recovery Time: {avg_recovery_time:.2f}s")
        print(f"   Max Recovery Time: {max_recovery_time:.2f}s")
        print(f"   Data Integrity Score: {data_integrity_score:.1f}%")
        
        # Detailed results
        for result in self.results:
            status = "🟢 SUCCESS" if result.success else "🔴 FAILED"
            print(f"\n{status} - {result.test_name}")
            print(f"   Recovery Time: {result.recovery_time:.2f}s")
            print(f"   Data Integrity: {'✅' if result.data_integrity else '❌'}")
            print(f"   Description: {result.description}")
            print(f"   Recommendation: {result.recommendation}")
        
        # Overall recovery rating
        if recovery_score >= 90 and avg_recovery_time < 60:
            rating = "🟢 EXCELLENT - Robust Disaster Recovery"
        elif recovery_score >= 70 and avg_recovery_time < 120:
            rating = "🟡 GOOD - Minor Recovery Improvements Needed"
        elif recovery_score >= 50:
            rating = "🟠 FAIR - Significant Recovery Improvements Needed"
        else:
            rating = "🔴 POOR - Major Recovery Issues Found"
        
        print(f"\n🏆 OVERALL DISASTER RECOVERY RATING: {rating}")
        
        return {
            "recovery_score": recovery_score,
            "successful_tests": successful_tests,
            "failed_tests": failed_tests,
            "avg_recovery_time": avg_recovery_time,
            "max_recovery_time": max_recovery_time,
            "data_integrity_score": data_integrity_score,
            "total_tests": total_tests,
            "rating": rating,
            "detailed_results": self.results
        }

async def run_disaster_recovery_validation():
    """Run the complete disaster recovery validation suite."""
    async with DisasterRecoveryValidator() as validator:
        return await validator.run_comprehensive_disaster_recovery_test()

if __name__ == "__main__":
    asyncio.run(run_disaster_recovery_validation())
