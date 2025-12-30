using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;
using TMPro;
using System;
using System.Collections;
using System.Text;

/// <summary>
/// Simple test harness for KeeperBoard API validation.
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
        testPlayerGuid = "unity-test-" + Guid.NewGuid().ToString().Substring(0, 8);

        if (apiUrlInput != null)
        {
            apiUrlInput.text = apiUrl;
            apiUrlInput.onEndEdit.AddListener(url => apiUrl = url);
        }

        if (runTestsButton != null)
        {
            runTestsButton.onClick.AddListener(() => StartCoroutine(RunAllTests()));
        }

        Log("Ready. Click Run Tests.");
    }

    private IEnumerator RunAllTests()
    {
        results.Clear();
        passCount = 0;
        failCount = 0;
        testPlayerGuid = "unity-test-" + Guid.NewGuid().ToString().Substring(0, 8);

        if (apiUrlInput != null)
            apiUrl = apiUrlInput.text.TrimEnd('/');

        Log("Running tests...\n");

        yield return TestHealth();
        yield return TestSubmitScore(100);
        yield return TestGetLeaderboard();
        yield return TestGetPlayer();
        yield return TestSubmitLowerScore(50);
        yield return TestSubmitHigherScore(200);
        yield return TestUpdatePlayerName();
        yield return TestGetLeaderboard();

        // Summary
        Log($"\n{passCount} passed, {failCount} failed");
        if (failCount == 0)
            Log("\nAll tests passed!");
    }

    private IEnumerator TestHealth()
    {
        using var request = UnityWebRequest.Get($"{apiUrl}/health");
        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            var data = JsonUtility.FromJson<HealthResponse>(request.downloadHandler.text);
            if (data.success && data.data.service == "keeperboard")
                Pass("Health");
            else
                Fail("Health", "bad response");
        }
        else
            Fail("Health", request.error);
    }

    private IEnumerator TestSubmitScore(int score)
    {
        var payload = new ScoreSubmission { player_guid = testPlayerGuid, player_name = "TestPlayer", score = score };
        using var request = PostRequest($"{apiUrl}/scores", payload);
        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            var data = JsonUtility.FromJson<ScoreResponse>(request.downloadHandler.text);
            if (data.success && data.data.score == score)
                Pass("Submit score");
            else
                Fail("Submit score", "bad response");
        }
        else
            Fail("Submit score", request.error);
    }

    private IEnumerator TestSubmitLowerScore(int score)
    {
        var payload = new ScoreSubmission { player_guid = testPlayerGuid, player_name = "TestPlayer", score = score };
        using var request = PostRequest($"{apiUrl}/scores", payload);
        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            var data = JsonUtility.FromJson<ScoreResponse>(request.downloadHandler.text);
            if (data.success && data.data.score == 100 && !data.data.is_new_high_score)
                Pass("Reject lower score");
            else
                Fail("Reject lower score", $"score updated to {data.data.score}");
        }
        else
            Fail("Reject lower score", request.error);
    }

    private IEnumerator TestSubmitHigherScore(int score)
    {
        var payload = new ScoreSubmission { player_guid = testPlayerGuid, player_name = "TestPlayer", score = score };
        using var request = PostRequest($"{apiUrl}/scores", payload);
        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            var data = JsonUtility.FromJson<ScoreResponse>(request.downloadHandler.text);
            if (data.success && data.data.score == score && data.data.is_new_high_score)
                Pass("Accept higher score");
            else
                Fail("Accept higher score", "not updated");
        }
        else
            Fail("Accept higher score", request.error);
    }

    private IEnumerator TestGetLeaderboard()
    {
        using var request = UnityWebRequest.Get($"{apiUrl}/leaderboard?limit=10");
        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            var data = JsonUtility.FromJson<LeaderboardResponse>(request.downloadHandler.text);
            if (data.success && data.data.entries != null)
                Pass("Get leaderboard");
            else
                Fail("Get leaderboard", "bad response");
        }
        else
            Fail("Get leaderboard", request.error);
    }

    private IEnumerator TestGetPlayer()
    {
        using var request = UnityWebRequest.Get($"{apiUrl}/player/{testPlayerGuid}");
        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            var data = JsonUtility.FromJson<PlayerResponse>(request.downloadHandler.text);
            if (data.success && data.data.rank > 0)
                Pass("Get player");
            else
                Fail("Get player", "bad response");
        }
        else
            Fail("Get player", request.error);
    }

    private IEnumerator TestUpdatePlayerName()
    {
        var payload = new PlayerNameUpdate { player_name = "Updated" };
        using var request = PutRequest($"{apiUrl}/player/{testPlayerGuid}", payload);
        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            var data = JsonUtility.FromJson<PlayerResponse>(request.downloadHandler.text);
            if (data.success && data.data.player_name == "Updated")
                Pass("Update name");
            else
                Fail("Update name", "not updated");
        }
        else
            Fail("Update name", request.error);
    }

    private UnityWebRequest PostRequest<T>(string url, T payload)
    {
        var json = JsonUtility.ToJson(payload);
        var request = new UnityWebRequest(url, "POST");
        request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");
        return request;
    }

    private UnityWebRequest PutRequest<T>(string url, T payload)
    {
        var json = JsonUtility.ToJson(payload);
        var request = new UnityWebRequest(url, "PUT");
        request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
        request.downloadHandler = new DownloadHandlerBuffer();
        request.SetRequestHeader("Content-Type", "application/json");
        return request;
    }

    private void Pass(string test)
    {
        passCount++;
        Log($"[PASS] {test}");
    }

    private void Fail(string test, string error)
    {
        failCount++;
        Log($"[FAIL] {test}: {error}");
    }

    private void Log(string message)
    {
        results.AppendLine(message);
        if (resultsText != null)
            resultsText.text = results.ToString();
        Debug.Log($"[KeeperBoard] {message}");
    }
}
