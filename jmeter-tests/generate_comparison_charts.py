#!/usr/bin/env python3
"""
JMeter Performance Test Results Comparison Script
Generates bar charts comparing all 4 test combinations
"""

import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import os
from pathlib import Path
import json

# Configuration
RESULTS_DIR = Path(__file__).parent / "results"
REPORTS_DIR = Path(__file__).parent / "reports"
CHARTS_DIR = Path(__file__).parent / "charts"
CHARTS_DIR.mkdir(exist_ok=True)

# Combination configurations
COMBINATIONS = {
    "BASE": {
        "file": "results_base.jtl",
        "label": "Combination 1: BASE",
        "color": "#FF6B6B"
    },
    "BASE_REDIS": {
        "file": "results_base_redis.jtl",
        "label": "Combination 2: BASE + REDIS",
        "color": "#4ECDC4"
    },
    "BASE_REDIS_KAFKA": {
        "file": "results_base_redis_kafka.jtl",
        "label": "Combination 3: BASE + REDIS + KAFKA",
        "color": "#45B7D1"
    },
    "ALL_OPTIMIZATIONS": {
        "file": "results_all_optimizations.jtl",
        "label": "Combination 4: ALL OPTIMIZATIONS",
        "color": "#96CEB4"
    }
}

def parse_jtl_file(file_path):
    """Parse JMeter JTL file and extract metrics"""
    if not file_path.exists():
        print(f"Warning: {file_path} not found")
        return None
    
    try:
        # JTL format: timestamp,elapsed,label,responseCode,responseMessage,threadName,dataType,success,failureMessage,bytes,sentBytes,grpThreads,allThreads,URL,Latency,IdleTime,Connect
        # Try comma separator first (CSV format), then tab
        df = None
        for sep in [',', '\t']:
            try:
                df = pd.read_csv(file_path, sep=sep, header=0, on_bad_lines='skip', low_memory=False)
                # Check if we got multiple columns
                if len(df.columns) > 1:
                    break
            except:
                continue
        
        if df is None or len(df.columns) <= 1:
            # Fallback: read without header and manually parse
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            if len(lines) < 2:
                return None
            
            # Parse header
            header = lines[0].strip().split('\t') if '\t' in lines[0] else lines[0].strip().split(',')
            # Standard column names
            standard_cols = ['timestamp', 'elapsed', 'label', 'responseCode', 'responseMessage',
                            'threadName', 'dataType', 'success', 'failureMessage', 'bytes',
                            'sentBytes', 'grpThreads', 'allThreads', 'URL', 'Latency',
                            'IdleTime', 'Connect']
            
            # Parse data rows
            data_rows = []
            for line in lines[1:]:
                if not line.strip():
                    continue
                parts = line.strip().split('\t') if '\t' in line else line.strip().split(',')
                if len(parts) >= len(standard_cols):
                    data_rows.append(parts[:len(standard_cols)])
            
            df = pd.DataFrame(data_rows, columns=standard_cols)
        
        # Normalize column names (handle case variations and strip whitespace)
        df.columns = df.columns.str.strip()
        # Create mapping from original to standard names (case-insensitive)
        original_cols = {col.lower(): col for col in df.columns}
        column_mapping = {}
        for std_name in ['timestamp', 'elapsed', 'label', 'responseCode', 'responseMessage',
                        'threadName', 'dataType', 'success', 'failureMessage', 'bytes',
                        'sentBytes', 'grpThreads', 'allThreads', 'URL', 'Latency',
                        'IdleTime', 'Connect']:
            std_lower = std_name.lower()
            if std_lower in original_cols:
                column_mapping[original_cols[std_lower]] = std_name
        df = df.rename(columns=column_mapping)
        
        # Convert success to boolean - handle both 'true'/'false' strings and boolean values
        if df['success'].dtype == 'object':
            df['success'] = df['success'].astype(str).str.lower().str.strip() == 'true'
        else:
            df['success'] = df['success'].astype(bool)
        
        df['elapsed'] = pd.to_numeric(df['elapsed'], errors='coerce')
        df['responseCode'] = pd.to_numeric(df['responseCode'], errors='coerce')
        df['timestamp'] = pd.to_numeric(df['timestamp'], errors='coerce')
        
        # Convert numeric columns that might be numpy types
        for col in ['elapsed', 'responseCode', 'timestamp']:
            if col in df.columns:
                df[col] = df[col].astype(float)
        
        return df
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        return None

def calculate_metrics(df, combination_name):
    """Calculate performance metrics from dataframe"""
    if df is None or df.empty:
        return None
    
    total_requests = len(df)
    successful = df['success'].sum()
    failed = total_requests - successful
    success_rate = (successful / total_requests * 100) if total_requests > 0 else 0
    error_rate = (failed / total_requests * 100) if total_requests > 0 else 0
    
    # Response time metrics (in milliseconds)
    elapsed_times = df['elapsed'].dropna()
    avg_response_time = elapsed_times.mean() if len(elapsed_times) > 0 else 0
    min_response_time = elapsed_times.min() if len(elapsed_times) > 0 else 0
    max_response_time = elapsed_times.max() if len(elapsed_times) > 0 else 0
    median_response_time = elapsed_times.median() if len(elapsed_times) > 0 else 0
    p95_response_time = elapsed_times.quantile(0.95) if len(elapsed_times) > 0 else 0
    p99_response_time = elapsed_times.quantile(0.99) if len(elapsed_times) > 0 else 0
    
    # Error breakdown
    error_400 = len(df[df['responseCode'] == 400])
    error_401 = len(df[df['responseCode'] == 401])
    error_404 = len(df[df['responseCode'] == 404])
    error_409 = len(df[df['responseCode'] == 409])
    error_500 = len(df[df['responseCode'] == 500])
    
    # Throughput calculation (requests per second)
    # Assuming test duration from first to last timestamp
    if len(df) > 1:
        test_duration = (df['timestamp'].max() - df['timestamp'].min()) / 1000  # Convert to seconds
        throughput = total_requests / test_duration if test_duration > 0 else 0
    else:
        throughput = 0
    
    # Latency metrics (if available)
    latency_times = df['Latency'].dropna() if 'Latency' in df.columns else pd.Series()
    avg_latency = latency_times.mean() if len(latency_times) > 0 else 0
    
    return {
        'combination': combination_name,
        'total_requests': total_requests,
        'successful': successful,
        'failed': failed,
        'success_rate': success_rate,
        'error_rate': error_rate,
        'avg_response_time': avg_response_time,
        'min_response_time': min_response_time,
        'max_response_time': max_response_time,
        'median_response_time': median_response_time,
        'p95_response_time': p95_response_time,
        'p99_response_time': p99_response_time,
        'error_400': error_400,
        'error_401': error_401,
        'error_404': error_404,
        'error_409': error_409,
        'error_500': error_500,
        'throughput': throughput,
        'avg_latency': avg_latency
    }

def create_bar_chart(data, metric_name, ylabel, title, filename, colors):
    """Create a bar chart comparing metrics across combinations"""
    combinations = [d['combination'] for d in data if d is not None]
    values = [d[metric_name] for d in data if d is not None]
    labels = [COMBINATIONS[c]['label'] for c in combinations]
    chart_colors = [COMBINATIONS[c]['color'] for c in combinations]
    
    if not values:
        print(f"No data available for {metric_name}")
        return
    
    fig, ax = plt.subplots(figsize=(12, 6))
    bars = ax.bar(labels, values, color=chart_colors, alpha=0.8, edgecolor='black', linewidth=1.2)
    
    # Add value labels on bars
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.2f}',
                ha='center', va='bottom', fontsize=10, fontweight='bold')
    
    ax.set_ylabel(ylabel, fontsize=12, fontweight='bold')
    ax.set_title(title, fontsize=14, fontweight='bold', pad=20)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_axisbelow(True)
    
    # Rotate x-axis labels if needed
    plt.xticks(rotation=15, ha='right')
    plt.tight_layout()
    
    # Save chart
    filepath = CHARTS_DIR / filename
    plt.savefig(filepath, dpi=300, bbox_inches='tight')
    print(f"Saved: {filepath}")
    plt.close()

def create_error_breakdown_chart(data, filename):
    """Create stacked bar chart for error breakdown"""
    combinations = [d['combination'] for d in data if d is not None]
    labels = [COMBINATIONS[c]['label'] for c in combinations]
    colors = [COMBINATIONS[c]['color'] for c in combinations]
    
    error_400 = [d['error_400'] for d in data if d is not None]
    error_401 = [d['error_401'] for d in data if d is not None]
    error_404 = [d['error_404'] for d in data if d is not None]
    error_409 = [d['error_409'] for d in data if d is not None]
    error_500 = [d['error_500'] for d in data if d is not None]
    
    fig, ax = plt.subplots(figsize=(12, 6))
    x = np.arange(len(labels))
    width = 0.6
    
    p1 = ax.bar(x, error_400, width, label='400 Bad Request', color='#FF6B6B', alpha=0.8)
    p2 = ax.bar(x, error_401, width, bottom=error_400, label='401 Unauthorized', color='#FFA07A', alpha=0.8)
    p3 = ax.bar(x, error_404, width, bottom=np.array(error_400)+np.array(error_401), 
                label='404 Not Found', color='#FFD700', alpha=0.8)
    p4 = ax.bar(x, error_409, width, 
                bottom=np.array(error_400)+np.array(error_401)+np.array(error_404),
                label='409 Conflict', color='#98D8C8', alpha=0.8)
    p5 = ax.bar(x, error_500, width,
                bottom=np.array(error_400)+np.array(error_401)+np.array(error_404)+np.array(error_409),
                label='500 Server Error', color='#C44569', alpha=0.8)
    
    ax.set_ylabel('Number of Errors', fontsize=12, fontweight='bold')
    ax.set_title('Error Breakdown by Type Across All Combinations', fontsize=14, fontweight='bold', pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=15, ha='right')
    ax.legend(loc='upper left')
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_axisbelow(True)
    
    plt.tight_layout()
    filepath = CHARTS_DIR / filename
    plt.savefig(filepath, dpi=300, bbox_inches='tight')
    print(f"Saved: {filepath}")
    plt.close()

def create_response_time_comparison_chart(data, filename):
    """Create grouped bar chart for response time percentiles"""
    combinations = [d['combination'] for d in data if d is not None]
    labels = [COMBINATIONS[c]['label'] for c in combinations]
    
    avg = [d['avg_response_time'] for d in data if d is not None]
    median = [d['median_response_time'] for d in data if d is not None]
    p95 = [d['p95_response_time'] for d in data if d is not None]
    p99 = [d['p99_response_time'] for d in data if d is not None]
    
    x = np.arange(len(labels))
    width = 0.2
    
    fig, ax = plt.subplots(figsize=(14, 7))
    ax.bar(x - 1.5*width, avg, width, label='Average', color='#4ECDC4', alpha=0.8)
    ax.bar(x - 0.5*width, median, width, label='Median', color='#45B7D1', alpha=0.8)
    ax.bar(x + 0.5*width, p95, width, label='95th Percentile', color='#96CEB4', alpha=0.8)
    ax.bar(x + 1.5*width, p99, width, label='99th Percentile', color='#FFE66D', alpha=0.8)
    
    ax.set_ylabel('Response Time (ms)', fontsize=12, fontweight='bold')
    ax.set_title('Response Time Percentiles Comparison', fontsize=14, fontweight='bold', pad=20)
    ax.set_xticks(x)
    ax.set_xticklabels(labels, rotation=15, ha='right')
    ax.legend()
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.set_axisbelow(True)
    
    plt.tight_layout()
    filepath = CHARTS_DIR / filename
    plt.savefig(filepath, dpi=300, bbox_inches='tight')
    print(f"Saved: {filepath}")
    plt.close()

def generate_summary_report(data):
    """Generate a summary JSON report"""
    summary = {
        'generated_at': pd.Timestamp.now().isoformat(),
        'combinations': []
    }
    
    for d in data:
        if d is not None:
            # Convert numpy types to native Python types for JSON serialization
            combo_data = {}
            for key, value in d.items():
                if pd.isna(value):
                    combo_data[key] = None
                elif isinstance(value, (np.integer, np.int64)):
                    combo_data[key] = int(value)
                elif isinstance(value, (np.floating, np.float64)):
                    combo_data[key] = float(value)
                else:
                    combo_data[key] = value
            summary['combinations'].append(combo_data)
    
    report_path = CHARTS_DIR / "summary_report.json"
    with open(report_path, 'w') as f:
        json.dump(summary, f, indent=2)
    print(f"Saved summary report: {report_path}")

def main():
    print("=" * 60)
    print("JMeter Performance Test Results Comparison")
    print("=" * 60)
    print()
    
    # Parse all JTL files
    all_data = []
    for combo_key, combo_config in COMBINATIONS.items():
        file_path = RESULTS_DIR / combo_config['file']
        print(f"Processing {combo_config['label']}...")
        df = parse_jtl_file(file_path)
        metrics = calculate_metrics(df, combo_key)
        all_data.append(metrics)
        
        if metrics:
            print(f"  ✓ Total Requests: {metrics['total_requests']}")
            print(f"  ✓ Success Rate: {metrics['success_rate']:.2f}%")
            print(f"  ✓ Avg Response Time: {metrics['avg_response_time']:.2f}ms")
            print(f"  ✓ Throughput: {metrics['throughput']:.2f} req/s")
        print()
    
    # Filter out None values
    valid_data = [d for d in all_data if d is not None]
    
    if not valid_data:
        print("Error: No valid data found. Please check that JTL files exist.")
        return
    
    print("Generating charts...")
    print()
    
    # 1. Success Rate Comparison
    create_bar_chart(valid_data, 'success_rate', 'Success Rate (%)', 
                    'Success Rate Comparison Across All Combinations',
                    '01_success_rate.png', None)
    
    # 2. Error Rate Comparison
    create_bar_chart(valid_data, 'error_rate', 'Error Rate (%)',
                    'Error Rate Comparison Across All Combinations',
                    '02_error_rate.png', None)
    
    # 3. Average Response Time
    create_bar_chart(valid_data, 'avg_response_time', 'Response Time (ms)',
                    'Average Response Time Comparison',
                    '03_avg_response_time.png', None)
    
    # 4. Median Response Time
    create_bar_chart(valid_data, 'median_response_time', 'Response Time (ms)',
                    'Median Response Time Comparison',
                    '04_median_response_time.png', None)
    
    # 5. P95 Response Time
    create_bar_chart(valid_data, 'p95_response_time', 'Response Time (ms)',
                    '95th Percentile Response Time Comparison',
                    '05_p95_response_time.png', None)
    
    # 6. P99 Response Time
    create_bar_chart(valid_data, 'p99_response_time', 'Response Time (ms)',
                    '99th Percentile Response Time Comparison',
                    '06_p99_response_time.png', None)
    
    # 7. Throughput Comparison
    create_bar_chart(valid_data, 'throughput', 'Throughput (requests/second)',
                    'Throughput Comparison Across All Combinations',
                    '07_throughput.png', None)
    
    # 8. Total Requests
    create_bar_chart(valid_data, 'total_requests', 'Number of Requests',
                    'Total Requests Comparison',
                    '08_total_requests.png', None)
    
    # 9. Response Time Percentiles (Grouped)
    create_response_time_comparison_chart(valid_data, '09_response_time_percentiles.png')
    
    # 10. Error Breakdown (Stacked)
    create_error_breakdown_chart(valid_data, '10_error_breakdown.png')
    
    # Generate summary report
    generate_summary_report(valid_data)
    
    print()
    print("=" * 60)
    print("All charts generated successfully!")
    print(f"Charts saved in: {CHARTS_DIR}")
    print("=" * 60)

if __name__ == "__main__":
    main()

