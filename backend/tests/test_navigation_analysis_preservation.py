from pathlib import Path


def test_navigation_analysis_preservation_architecture():
    """
    Verifies that analysis results are cached, preserved across page navigations,
    and not re-triggered unnecessarily when moving between Dashboard, History,
    and Recommendations (Progress).
    """
    root_dir = Path(__file__).resolve().parent.parent.parent
    frontend_src = root_dir / "frontend" / "src"

    analysis_context_file = frontend_src / "context" / "AnalysisContext.tsx"
    app_file = frontend_src / "App.tsx"
    dashboard_file = frontend_src / "pages" / "DashboardPage.tsx"
    recommendations_file = frontend_src / "pages" / "RecommendationsPage.tsx"
    auth_context_file = frontend_src / "context" / "AuthContext.tsx"
    oauth_callback_file = frontend_src / "pages" / "OAuthCallbackPage.tsx"

    assert analysis_context_file.exists(), f"Missing {analysis_context_file}"
    assert app_file.exists(), f"Missing {app_file}"
    assert dashboard_file.exists(), f"Missing {dashboard_file}"
    assert recommendations_file.exists(), f"Missing {recommendations_file}"
    assert auth_context_file.exists(), f"Missing {auth_context_file}"
    assert oauth_callback_file.exists(), f"Missing {oauth_callback_file}"

    # 1. Verify AnalysisContext architecture
    ctx_content = analysis_context_file.read_text(encoding="utf-8")
    assert "devprofile_analysis_cache_" in ctx_content, "Must use user-scoped sessionStorage key"
    assert "saveAnalysis" in ctx_content, "Must provide saveAnalysis"
    assert "getCachedAnalysis" in ctx_content, "Must provide getCachedAnalysis"
    assert "clearAnalysis" in ctx_content, "Must provide clearAnalysis"
    assert "sessionStorage" in ctx_content, "Must persist to sessionStorage for browser refresh"

    # 2. Verify App.tsx wraps application with AnalysisProvider
    app_content = app_file.read_text(encoding="utf-8")
    assert "AnalysisProvider" in app_content, "App.tsx must include AnalysisProvider"
    assert "<AnalysisProvider>" in app_content, "App.tsx must wrap components with <AnalysisProvider>"

    # 3. Verify DashboardPage uses AnalysisContext and preserves state
    dash_content = dashboard_file.read_text(encoding="utf-8")
    assert "useAnalysis" in dash_content, "DashboardPage must consume useAnalysis"
    assert "saveAnalysis" in dash_content, "DashboardPage must save completed analysis"
    assert "getCachedAnalysis" in dash_content, "DashboardPage must check cache before live fetch"

    # 4. Verify DashboardPage preserves analysis on navigation to avoid repeated calls
    # When analysisData is already loaded or in cache, it must NOT run live analysis
    assert "if (analysisData) {" in dash_content or "if (analysisData &&" in dash_content
    assert "getCachedAnalysis" in dash_content

    # 5. Verify explicit re-analysis remains supported
    assert "Re-analyze" in dash_content, "Re-analyze action button must remain available"
    assert "forceRefresh" in dash_content, "Explicit force refresh must be supported"

    # 6. Verify Progress (Recommendations) page navigates to fresh analysis with refresh trigger
    recs_content = recommendations_file.read_text(encoding="utf-8")
    assert "/dashboard?refresh=true" in recs_content, "Run Fresh Analysis must route to dashboard with refresh parameter"

    # 7. Verify AuthContext purges session analysis cache on logout
    auth_content = auth_context_file.read_text(encoding="utf-8")
    assert "devprofile_analysis_cache_" in auth_content, "Logout must purge user analysis cache from sessionStorage"

    # 8. Verify OAuthCallbackPage stores initial analysis in cache to prevent duplicate fetch on redirect
    oauth_content = oauth_callback_file.read_text(encoding="utf-8")
    assert "saveAnalysis" in oauth_content, "OAuthCallbackPage must save initial analysis to cache"
