using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;
using TMPro;
using System;
using System.Collections;
using System.Text;

// UI Setup: Canvas with TMP_InputField (API URL), Button (Run Tests), and TextMeshProUGUI (Results)
// Just use a big text box for results - no ScrollView needed

/// <summary>
/// Test harness for validating KeeperBoard API endpoints.
/// Runs a series of tests against the API and displays results.
/// </summary>
public class KeeperBoardTester : MonoBehaviour
{
    [Header("Configuration")]
    [SerializeField] private string apiUrl = "http://localhost:3000/api/v1";

    [Header("UI References")]
    [SerializeField] private TMP_InputField apiUrlInput;
    [SerializeField] private TextMeshProUGUI resultsText;
    [SerializeField] private Button runTestsButton;

    private StringBuilder results = new StringBuilder();
    private string testPlayerGuid;
    private int passCount = 0;
    private int failCount = 0;

    private void Start()
    {
        // Generate unique test player GUID
        testPlayerGuid = "unity-test-" + Guid.NewGuid().ToString().Substring(0, 8);

        // Setup UI
        if (apiUrlInput != null)
        {
            apiUrlInput.text = apiUrl;
            apiUrlInput.onEndEdit.AddListener(url => apiUrl = url);
        }

        if (runTestsButton != null)
        {
            runTestsButton.onClick.AddListener(() => StartCoroutine(RunAllTests()));
        }

        Log("=== KeeperBoard Test Harness ===");
        Log($"API URL: {apiUrl}");
        Log($"Test Player GUID: {testPlayerGuid}");
        Log("\nClick 'Run Tests' to start validation.\n");
    }

    private IEnumerator RunAllTests()
    {
        // Reset state
        results.Clear();
        passCount = 0;
        failCount = 0;
        testPlayerGuid = "unity-test-" + Guid.NewGuid().ToString().Substring(0, 8);

        // Update API URL from input
        if (apiUrlInput != null)
        {
            apiUrl = apiUrlInput.text.TrimEnd('/');
        }

        Log("=== Starting KeeperBoard API Tests ===");
        Log($"API URL: {apiUrl}");
        Log($"Test Player GUID: {testPlayerGuid}");
        Log($"Timestamp: {DateTime.Now:yyyy-MM-dd HH:mm:ss}\n");

        // Run tests in sequence
        yield return TestHealth();
        yield return TestSubmitScore(100, "Initial score submission");
        yield return TestGetLeaderboard("After initial submission");
        yield return TestGetPlayer();
        yield return TestSubmitLowerScore(50);
        yield return TestSubmitHigherScore(200);
        yield return TestUpdatePlayerName("UpdatedName");
        yield return TestGetLeaderboard("Final verification");

        // Summary
        Log("\n" + new string('=', 50));
        Log("=== TEST SUMMARY ===");
        Log($"Passed: {passCount}");
        Log($"Failed: {failCount}");
        Log($"Total:  {passCount + failCount}");
        Log(new string('=', 50));

        if (failCount == 0)
        {
            Log("\n[SUCCESS] All tests passed! KeeperBoard API is working correctly.");
        }
        else
        {
            Log($"\n[WARNING] {failCount} test(s) failed. Check the logs above for details.");
        }
    }

    #region Test Methods

    private IEnumerator TestHealth()
    {
        Log("\n[TEST] Health Check");
        Log("[REQUEST] GET /health");

        using (var request = UnityWebRequest.Get($"{apiUrl}/health"))
        {
            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = request.downloadHandler.text;
                Log($"[RESPONSE] {request.responseCode} OK");
                LogJson(response);

                var data = JsonUtility.FromJson<HealthResponse>(response);
                if (data.success && data.data.service == "keeperboard")
                {
                    LogPass("Health check returned valid response");
                }
                else
                {
                    LogFail("Unexpected response format");
                }
            }
            else
            {
                LogRequestError(request);
            }
        }
    }

    private IEnumerator TestSubmitScore(int score, string description)
    {
        Log($"\n[TEST] Submit Score ({score}) - {description}");
        Log("[REQUEST] POST /scores");

        var payload = new ScoreSubmission
        {
            player_guid = testPlayerGuid,
            player_name = "TestPlayer",
            score = score
        };

        using (var request = CreatePostRequest($"{apiUrl}/scores", payload))
        {
            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = request.downloadHandler.text;
                Log($"[RESPONSE] {request.responseCode} OK");
                LogJson(response);

                var data = JsonUtility.FromJson<ScoreResponse>(response);
                if (data.success && data.data.score == score && data.data.rank > 0)
                {
                    LogPass($"Score submitted successfully (rank: {data.data.rank}, is_new_high_score: {data.data.is_new_high_score})");
                }
                else
                {
                    LogFail("Unexpected response format or missing data");
                }
            }
            else
            {
                LogRequestError(request);
            }
        }
    }

    private IEnumerator TestSubmitLowerScore(int score)
    {
        Log($"\n[TEST] Submit Lower Score ({score}) - Should NOT update");
        Log("[REQUEST] POST /scores");

        var payload = new ScoreSubmission
        {
            player_guid = testPlayerGuid,
            player_name = "TestPlayer",
            score = score
        };

        using (var request = CreatePostRequest($"{apiUrl}/scores", payload))
        {
            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = request.downloadHandler.text;
                Log($"[RESPONSE] {request.responseCode} OK");
                LogJson(response);

                var data = JsonUtility.FromJson<ScoreResponse>(response);
                // Score should remain at 100 (previous), not update to 50
                if (data.success && data.data.score == 100 && !data.data.is_new_high_score)
                {
                    LogPass("Lower score correctly rejected - kept original score of 100");
                }
                else if (data.data.score == score)
                {
                    LogFail($"Score was incorrectly updated to {score}");
                }
                else
                {
                    LogFail($"Unexpected score value: {data.data.score}");
                }
            }
            else
            {
                LogRequestError(request);
            }
        }
    }

    private IEnumerator TestSubmitHigherScore(int score)
    {
        Log($"\n[TEST] Submit Higher Score ({score}) - Should update");
        Log("[REQUEST] POST /scores");

        var payload = new ScoreSubmission
        {
            player_guid = testPlayerGuid,
            player_name = "TestPlayer",
            score = score
        };

        using (var request = CreatePostRequest($"{apiUrl}/scores", payload))
        {
            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = request.downloadHandler.text;
                Log($"[RESPONSE] {request.responseCode} OK");
                LogJson(response);

                var data = JsonUtility.FromJson<ScoreResponse>(response);
                if (data.success && data.data.score == score && data.data.is_new_high_score)
                {
                    LogPass($"Higher score correctly updated to {score}");
                }
                else
                {
                    LogFail($"Score was not updated correctly. Expected {score}, got {data.data.score}");
                }
            }
            else
            {
                LogRequestError(request);
            }
        }
    }

    private IEnumerator TestGetLeaderboard(string context)
    {
        Log($"\n[TEST] Get Leaderboard - {context}");
        Log("[REQUEST] GET /leaderboard?limit=10");

        using (var request = UnityWebRequest.Get($"{apiUrl}/leaderboard?limit=10"))
        {
            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = request.downloadHandler.text;
                Log($"[RESPONSE] {request.responseCode} OK");
                LogJson(response);

                var data = JsonUtility.FromJson<LeaderboardResponse>(response);
                if (data.success && data.data.entries != null)
                {
                    bool foundOurPlayer = false;
                    foreach (var entry in data.data.entries)
                    {
                        if (entry.player_guid == testPlayerGuid)
                        {
                            foundOurPlayer = true;
                            Log($"[INFO] Found our player at rank {entry.rank} with score {entry.score}");
                            break;
                        }
                    }

                    if (foundOurPlayer)
                    {
                        LogPass($"Leaderboard returned {data.data.entries.Length} entries, including our test player");
                    }
                    else
                    {
                        LogPass($"Leaderboard returned {data.data.entries.Length} entries (our player may not be in top 10)");
                    }
                }
                else
                {
                    LogFail("Unexpected response format");
                }
            }
            else
            {
                LogRequestError(request);
            }
        }
    }

    private IEnumerator TestGetPlayer()
    {
        Log("\n[TEST] Get Player Score & Rank");
        Log($"[REQUEST] GET /player/{testPlayerGuid}");

        using (var request = UnityWebRequest.Get($"{apiUrl}/player/{testPlayerGuid}"))
        {
            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = request.downloadHandler.text;
                Log($"[RESPONSE] {request.responseCode} OK");
                LogJson(response);

                var data = JsonUtility.FromJson<PlayerResponse>(response);
                if (data.success && data.data.player_guid == testPlayerGuid && data.data.rank > 0)
                {
                    LogPass($"Player found with score {data.data.score} at rank {data.data.rank}");
                }
                else
                {
                    LogFail("Unexpected response format or player not found");
                }
            }
            else
            {
                LogRequestError(request);
            }
        }
    }

    private IEnumerator TestUpdatePlayerName(string newName)
    {
        Log($"\n[TEST] Update Player Name to '{newName}'");
        Log($"[REQUEST] PUT /player/{testPlayerGuid}");

        var payload = new PlayerNameUpdate { player_name = newName };

        using (var request = CreatePutRequest($"{apiUrl}/player/{testPlayerGuid}", payload))
        {
            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                var response = request.downloadHandler.text;
                Log($"[RESPONSE] {request.responseCode} OK");
                LogJson(response);

                var data = JsonUtility.FromJson<PlayerResponse>(response);
                if (data.success && data.data.player_name == newName)
                {
                    LogPass($"Player name successfully updated to '{newName}'");
                }
                else
                {
                    LogFail($"Name not updated correctly. Expected '{newName}', got '{data.data.player_name}'");
                }
            }
            else
            {
                LogRequestError(request);
            }
        }
    }

    #endregion

    #region Helper Methods

    private UnityWebRequest CreatePostRequest<T>(string url, T payload)
    {
        var json = JsonUtility.ToJson(payload);
        var request = new UnityWebRequest(url, "POST");
        var bodyRaw = Encoding.UTF8.GetBytes(json);
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");
        Log($"[BODY] {json}");
        return request;
    }

    private UnityWebRequest CreatePutRequest<T>(string url, T payload)
    {
        var json = JsonUtility.ToJson(payload);
        var request = new UnityWebRequest(url, "PUT");
        var bodyRaw = Encoding.UTF8.GetBytes(json);
        request.uploadHandler = new UploadHandlerRaw(bodyRaw);
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");
        Log($"[BODY] {json}");
        return request;
    }

    private void Log(string message)
    {
        results.AppendLine(message);
        if (resultsText != null)
        {
            resultsText.text = results.ToString();
        }
        Debug.Log($"[KeeperBoard] {message}");
    }

    private void LogJson(string json)
    {
        // Truncate long JSON for display
        if (json.Length > 500)
        {
            Log($"[DATA] {json.Substring(0, 500)}...");
        }
        else
        {
            Log($"[DATA] {json}");
        }
    }

    private void LogPass(string message)
    {
        passCount++;
        Log($"[RESULT] PASS - {message}");
    }

    private void LogFail(string message)
    {
        failCount++;
        Log($"[RESULT] FAIL - {message}");
    }

    private void LogRequestError(UnityWebRequest request)
    {
        failCount++;
        Log($"[RESPONSE] {request.responseCode} ERROR");
        Log($"[ERROR] {request.error}");

        if (!string.IsNullOrEmpty(request.downloadHandler?.text))
        {
            Log($"[BODY] {request.downloadHandler.text}");
        }

        Log("[RESULT] FAIL - Request failed");
    }

    #endregion
}
