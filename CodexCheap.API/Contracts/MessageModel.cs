namespace CodexCheap.API.Contracts;

public class MessageModel<T>
{
    public int Status { get; set; } = 200;
    public bool Success { get; set; }
    public string Msg { get; set; } = string.Empty;
    public T? Response { get; set; }

    public static MessageModel<T> Ok(T response, string msg = "成功")
    {
        return new MessageModel<T> { Success = true, Msg = msg, Response = response };
    }

    public static MessageModel<T> Fail(string msg, int status = 500)
    {
        return new MessageModel<T> { Success = false, Msg = msg, Status = status };
    }
}
