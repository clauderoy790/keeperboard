using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;
using TMPro;
using System;
using System.Collections;
using System.Text;

/// <summary>
/// CSP Test Tool for demonstrating Unity Play's CSP restrictions.
/// Tests KeeperBoard API + various public APIs to prove all external requests are blocked.
/// </summary>
public class KeeperBoardTester : MonoBehaviour
{
    [Header("Configuration")]
    [SerializeField] private string defaultCustomUrl = "https://randomuser.me/api/";

    [Header("UI References")]
    [SerializeField] private TMP_InputField apiUrlInput;
    [SerializeField] private TextMeshProUGUI resultsText;

    [Header("Buttons")]
    [SerializeField] private Button runKeeperBoardButton;
    [SerializeField] private Button testHttpbinButton;
    [SerializeField] private Button testJsonPlaceholderButton;
    [SerializeField] private Button testGitHubButton;
    [SerializeField] private Button testCatFactsButton;
    [SerializeField] private Button testDogApiButton;
    [SerializeField] private Button testAllButton;
    [SerializeField] private Button testCustomUrlButton;
    [SerializeField] private Button testPostPutButton;

    // Public API endpoints for testing
    private const string HTTPBIN_URL = "https://httpbin.org/get";
    private const string JSONPLACEHOLDER_URL = "https://jsonplaceholder.typicode.com/posts/1";
    private const string GITHUB_URL = "https://api.github.com";
    private const string CATFACTS_URL = "https://catfact.ninja/fact";
    private const string DOGAPI_URL = "https://dog.ceo/api/breeds/image/random";

    private StringBuilder results = new StringBuilder();
    private string keeperBoardApiUrl;
    private string testPlayerGuid;
    private int passCount = 0;
    private int failCount = 0;

    private void Awake()
    {
        // Save initial input value as KeeperBoard API URL, then replace with custom URL sample
        if (apiUrlInput != null)
        {
            keeperBoardApiUrl = apiUrlInput.text.TrimEnd('/');
            apiUrlInput.text = defaultCustomUrl;
        }

        testPlayerGuid = "unity-test-" + Guid.NewGuid().ToString().Substring(0, 8);
    }

    private void Start()
    {
        // Wire up buttons
        if (runKeeperBoardButton != null)
            runKeeperBoardButton.onClick.AddListener(() => StartCoroutine(RunKeeperBoardTests()));

        if (testHttpbinButton != null)
            testHttpbinButton.onClick.AddListener(() => StartCoroutine(QuickGetTest("httpbin", HTTPBIN_URL)));

        if (testJsonPlaceholderButton != null)
            testJsonPlaceholderButton.onClick.AddListener(() => StartCoroutine(QuickGetTest("JSONPlaceholder", JSONPLACEHOLDER_URL)));

        if (testGitHubButton != null)
            testGitHubButton.onClick.AddListener(() => StartCoroutine(QuickGetTest("GitHub API", GITHUB_URL)));

        if (testCatFactsButton != null)
            testCatFactsButton.onClick.AddListener(() => StartCoroutine(QuickGetTest("Cat Facts", CATFACTS_URL)));

        if (testDogApiButton != null)
            testDogApiButton.onClick.AddListener(() => StartCoroutine(QuickGetTest("Dog API", DOGAPI_URL)));

        if (testAllButton != null)
            testAllButton.onClick.AddListener(() => StartCoroutine(TestAllPublicApis()));

        if (testCustomUrlButton != null)
            testCustomUrlButton.onClick.AddListener(() => StartCoroutine(TestCustomUrl()));

        if (testPostPutButton != null)
            testPostPutButton.onClick.AddListener(() => StartCoroutine(TestPostAndPut()));

        Log("=== CSP Test Tool ===");
        Log($"KeeperBoard API: {keeperBoardApiUrl}");
        Log("\nUse buttons to test various APIs.");
    }

    #region Quick GET Tests

    private IEnumerator QuickGetTest(string name, string url)
    {
        results.Clear();
        Log($"Testing {name}...");
        Log($"[GET] URL: {url}\n");

        using var request = UnityWebRequest.Get(url);
        request.timeout = 10;

        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            Log($"[PASS] {name}");
            Log($"Status: {request.responseCode}");
            var responsePreview = request.downloadHandler.text;
            if (responsePreview.Length > 200)
                responsePreview = responsePreview.Substring(0, 200) + "...";
            Log($"Response: {responsePreview}");
        }
        else
        {
            Log($"[FAIL] {name}");
            Log($"Error: {request.error}");
            if (!string.IsNullOrEmpty(request.downloadHandler?.text))
                Log($"Body: {request.downloadHandler.text}");
        }
    }

    private IEnumerator TestCustomUrl()
    {
        if (apiUrlInput == null) yield break;

        string url = apiUrlInput.text.Trim();
        if (string.IsNullOrEmpty(url))
        {
            results.Clear();
            Log("Enter a URL in the input field first.");
            yield break;
        }

        yield return QuickGetTest("Custom URL", url);
    }

    private IEnumerator TestAllPublicApis()
    {
        results.Clear();
        passCount = 0;
        failCount = 0;

        Log("=== Testing All Public APIs ===\n");

        yield return TestAndCount("httpbin", HTTPBIN_URL);
        yield return TestAndCount("JSONPlaceholder", JSONPLACEHOLDER_URL);
        yield return TestAndCount("GitHub API", GITHUB_URL);
        yield return TestAndCount("Cat Facts", CATFACTS_URL);
        yield return TestAndCount("Dog API", DOGAPI_URL);

        Log($"\n=== Summary ===");
        Log($"{passCount} passed, {failCount} blocked");

        if (failCount > 0)
            Log($"\n{failCount}/5 public APIs blocked by CSP");
    }

    private IEnumerator TestPostAndPut()
    {
        results.Clear();
        passCount = 0;
        failCount = 0;

        Log("=== Testing POST & PUT ===\n");

        // Test POST
        var postBody = "{\"msg\":\"test\"}";
        using (var postRequest = new UnityWebRequest("https://httpbin.org/post", "POST"))
        {
            postRequest.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(postBody));
            postRequest.downloadHandler = new DownloadHandlerBuffer();
            postRequest.SetRequestHeader("Content-Type", "application/json");
            postRequest.timeout = 10;
            yield return postRequest.SendWebRequest();

            if (postRequest.result == UnityWebRequest.Result.Success)
            {
                passCount++;
                Log($"[PASS] POST 200 OK");
                Log($"URL: https://httpbin.org/post");
                Log($"Sent: {postBody}");
            }
            else
            {
                failCount++;
                Log($"[FAIL] POST: {postRequest.error}");
                Log($"URL: https://httpbin.org/post");
            }
        }

        // Test PUT
        var putBody = "{\"id\":1,\"update\":true}";
        using (var putRequest = new UnityWebRequest("https://httpbin.org/put", "PUT"))
        {
            putRequest.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(putBody));
            putRequest.downloadHandler = new DownloadHandlerBuffer();
            putRequest.SetRequestHeader("Content-Type", "application/json");
            putRequest.timeout = 10;
            yield return putRequest.SendWebRequest();

            if (putRequest.result == UnityWebRequest.Result.Success)
            {
                passCount++;
                Log($"[PASS] PUT 200 OK");
                Log($"URL: https://httpbin.org/put");
                Log($"Sent: {putBody}");
            }
            else
            {
                failCount++;
                Log($"[FAIL] PUT: {putRequest.error}");
                Log($"URL: https://httpbin.org/put");
            }
        }

        Log($"\n{passCount}/2 passed");
    }

    private IEnumerator TestAndCount(string name, string url)
    {
        using var request = UnityWebRequest.Get(url);
        request.timeout = 10;

        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            passCount++;
            Log($"[PASS] {name}");
        }
        else
        {
            failCount++;
            Log($"[FAIL] {name}: {request.error}");
        }
    }

    #endregion

    #region KeeperBoard Tests

    private IEnumerator RunKeeperBoardTests()
    {
        results.Clear();
        passCount = 0;
        failCount = 0;
        testPlayerGuid = "unity-test-" + Guid.NewGuid().ToString().Substring(0, 8);

        Log("=== KeeperBoard API Tests ===");
        Log($"URL: {keeperBoardApiUrl}");
        Log($"Player: {testPlayerGuid}\n");

        yield return TestHealth();
        yield return TestSubmitScore(100);
        yield return TestGetLeaderboard();
        yield return TestGetPlayer();
        yield return TestSubmitLowerScore(50);
        yield return TestSubmitHigherScore(200);
        yield return TestUpdatePlayerName();
        yield return TestGetLeaderboard();

        Log($"\n{passCount} passed, {failCount} failed");
        if (failCount == 0)
            Log("\nAll tests passed!");
    }

    private IEnumerator TestHealth()
    {
        using var request = UnityWebRequest.Get($"{keeperBoardApiUrl}/health");
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
        using var request = PostRequest($"{keeperBoardApiUrl}/scores", payload);
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
        using var request = PostRequest($"{keeperBoardApiUrl}/scores", payload);
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
        using var request = PostRequest($"{keeperBoardApiUrl}/scores", payload);
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
        using var request = UnityWebRequest.Get($"{keeperBoardApiUrl}/leaderboard?limit=10");
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
        using var request = UnityWebRequest.Get($"{keeperBoardApiUrl}/player/{testPlayerGuid}");
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
        using var request = PutRequest($"{keeperBoardApiUrl}/player/{testPlayerGuid}", payload);
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

    #endregion

    #region Helpers

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
        Debug.Log($"[CSPTest] {message}");
    }

    #endregion
}
