using System;

/// <summary>
/// Data models for KeeperBoard API responses.
/// Used with Unity's JsonUtility for serialization.
/// </summary>

#region Request Models

[Serializable]
public class ScoreSubmission
{
    public string player_guid;
    public string player_name;
    public int score;
}

[Serializable]
public class PlayerNameUpdate
{
    public string player_name;
}

#endregion

#region Response Wrappers

[Serializable]
public class HealthResponse
{
    public bool success;
    public HealthData data;
}

[Serializable]
public class ScoreResponse
{
    public bool success;
    public ScoreData data;
}

[Serializable]
public class LeaderboardResponse
{
    public bool success;
    public LeaderboardData data;
}

[Serializable]
public class PlayerResponse
{
    public bool success;
    public PlayerData data;
}

[Serializable]
public class ErrorResponse
{
    public bool success;
    public string error;
    public string code;
}

#endregion

#region Data Models

[Serializable]
public class HealthData
{
    public string service;
    public string version;
    public string timestamp;
}

[Serializable]
public class ScoreData
{
    public string id;
    public string player_guid;
    public string player_name;
    public int score;
    public int rank;
    public bool is_new_high_score;
}

[Serializable]
public class LeaderboardData
{
    public LeaderboardEntry[] entries;
    public int total_count;
}

[Serializable]
public class LeaderboardEntry
{
    public int rank;
    public string player_guid;
    public string player_name;
    public int score;
}

[Serializable]
public class PlayerData
{
    public string id;
    public string player_guid;
    public string player_name;
    public int score;
    public int rank;
}

#endregion
