#!/usr/bin/env python3
"""
Fix JMeter test plans to achieve 100% success rate
"""
import re
import sys
from pathlib import Path

def fix_test_plan(file_path):
    """Fix a single test plan file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changes = []
    
    # 1. Add date parameter to Flight Search if missing
    flight_search_pattern = r'(<elementProp name="destination".*?</elementProp>\s*</collectionProp>)'
    if 'name="date"' not in content and re.search(flight_search_pattern, content):
        date_param = '''              <elementProp name="date" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                <stringProp name="Argument.value">2025-12-08</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
              </elementProp>
            </collectionProp>'''
        content = re.sub(
            r'(<elementProp name="destination".*?</elementProp>)\s*(</collectionProp>)',
            r'\1\n' + date_param,
            content,
            count=1
        )
        changes.append("Added date parameter to Flight Search")
    
    # 2. Make Get Booking use a variable or skip if booking doesn't exist
    # For now, let's use a pattern that works - we'll make it query bookings that exist
    # Actually, we can't easily fix this without JMeter variables, so we'll skip Get Booking
    # Or better: disable Get Booking since it requires pre-existing bookings
    
    # 3. Make Create Booking use unique timestamps to avoid conflicts
    # Add milliseconds to make each booking unique
    create_booking_pattern = r'(&quot;start_date&quot;: &quot;)(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})Z(&quot;)'
    if re.search(create_booking_pattern, content):
        # Add random milliseconds or timestamp to make unique
        # We'll use a variable ${__time()} in JMeter for uniqueness
        # For now, just ensure the date format is correct
        
        # Replace hardcoded dates with JMeter time function for uniqueness
        # start_date: ${__groovy(new Date().toInstant().toString(),)}
        # Actually, simpler: just use slightly different times
        pass  # Keep existing dates for now, will handle conflicts differently
    
    # 4. Ensure analytics doesn't require auth (should already be fixed)
    
    if content != original:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return changes
    return []

def main():
    test_plans_dir = Path(__file__).parent / "test-plans"
    test_plans = [
        "test_plan_base.jmx",
        "test_plan_base_redis.jmx",
        "test_plan_base_redis_kafka.jmx",
        "test_plan_all_optimizations.jmx"
    ]
    
    print("Fixing test plans...")
    for plan in test_plans:
        file_path = test_plans_dir / plan
        if file_path.exists():
            changes = fix_test_plan(file_path)
            if changes:
                print(f"  {plan}:")
                for change in changes:
                    print(f"    ✓ {change}")
            else:
                print(f"  {plan}: No changes needed")
        else:
            print(f"  {plan}: Not found")
    
    print("\nDone!")

if __name__ == "__main__":
    main()

