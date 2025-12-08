# Script to add authentication for Analytics endpoints in JMeter test plans
$testPlans = @(
    "test-plans/test_plan_base.jmx",
    "test-plans/test_plan_base_redis.jmx",
    "test-plans/test_plan_base_redis_kafka.jmx",
    "test-plans/test_plan_all_optimizations.jmx"
)

$loginEmail = "analyticsadmin@kayak.com"
$loginPassword = "AnalyticsAdmin123!"

foreach ($plan in $testPlans) {
    Write-Host "Processing $plan..." -ForegroundColor Cyan
    
    if (-not (Test-Path $plan)) {
        Write-Host "  ⚠️  File not found: $plan" -ForegroundColor Yellow
        continue
    }
    
    $content = Get-Content $plan -Raw
    
    # Find the Analytics request (11. Top Properties Analytics)
    # We need to add a login step before it and extract the token
    
    # Pattern to find the Analytics request section
    $analyticsPattern = '(?s)(<HTTPSamplerProxy[^>]*testname="11\. Top Properties Analytics"[^>]*>.*?</HTTPSamplerProxy>)'
    
    if ($content -match $analyticsPattern) {
        Write-Host "  ✅ Found Analytics request" -ForegroundColor Green
        
        # Create login step XML
        $loginStep = @"
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="10.5. Admin Login" enabled="true">
          <stringProp name="HTTPSampler.domain">localhost</stringProp>
          <stringProp name="HTTPSampler.port">3001</stringProp>
          <stringProp name="HTTPSampler.protocol">http</stringProp>
          <stringProp name="HTTPSampler.path">/users/login</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <stringProp name="HTTPSampler.method">POST</stringProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
          <boolProp name="HTTPSampler.postBodyRaw">false</boolProp>
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" testname="User Defined Variables">
             <collectionProp name="Arguments.arguments">
               <elementProp name="email" elementType="HTTPArgument">
                 <boolProp name="HTTPArgument.always_encode">false</boolProp>
                 <stringProp name="Argument.value">$loginEmail</stringProp>
                 <stringProp name="Argument.metadata">=</stringProp>
               </elementProp>
               <elementProp name="password" elementType="HTTPArgument">
                 <boolProp name="HTTPArgument.always_encode">false</boolProp>
                 <stringProp name="Argument.value">$loginPassword</stringProp>
                 <stringProp name="Argument.metadata">=</stringProp>
               </elementProp>
             </collectionProp>
          </elementProp>
          <stringProp name="HTTPSampler.postBodyRaw">false</stringProp>
        </HTTPSamplerProxy>
        <hashTree>
          <JSONPostProcessor guiclass="JSONPostProcessorGui" testclass="JSONPostProcessor" testname="Extract Access Token" enabled="true">
            <stringProp name="JSONPostProcessor.referenceName">accessToken</stringProp>
            <stringProp name="JSONPostProcessor.jsonPathExpr">$.data.accessToken</stringProp>
            <stringProp name="JSONPostProcessor.match_numbers">-1</stringProp>
            <stringProp name="JSONPostProcessor.defaultValues">NOT_FOUND</stringProp>
            <boolProp name="JSONPostProcessor.compute_concat">false</boolProp>
          </JSONPostProcessor>
        </hashTree>
"@
        
        # Add Header Manager for Analytics request with Authorization header
        $authHeader = @"
          <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="HTTP Header Manager - Auth" enabled="true">
            <collectionProp name="HeaderManager.headers">
              <elementProp name="" elementType="Header">
                <stringProp name="Header.name">Authorization</stringProp>
                <stringProp name="Header.value">Bearer ${accessToken}</stringProp>
              </elementProp>
            </collectionProp>
          </HeaderManager>
"@
        
        # Insert login step before Analytics request
        # Find position before "11. Top Properties Analytics"
        $beforeAnalytics = $content -replace '(?s)(<HTTPSamplerProxy[^>]*testname="11\. Top Properties Analytics")', "$loginStep`n        `$1"
        
        # Add auth header manager before Analytics request
        $withAuthHeader = $beforeAnalytics -replace '(?s)(<HTTPSamplerProxy[^>]*testname="11\. Top Properties Analytics"[^>]*>.*?<hashTree>)', "$authHeader`n          `$1"
        
        # Save the modified content
        $withAuthHeader | Set-Content $plan -NoNewline
        Write-Host "  ✅ Updated $plan with authentication" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Analytics request not found in $plan" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ All test plans updated!" -ForegroundColor Green

