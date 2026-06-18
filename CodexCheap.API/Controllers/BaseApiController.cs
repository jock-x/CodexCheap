using CodexCheap.API.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace CodexCheap.API.Controllers;

[ApiController]
public abstract class BaseApiController : ControllerBase
{
    protected ActionResult<MessageModel<T>> OkMessage<T>(T response, string msg = "成功")
    {
        return Ok(MessageModel<T>.Ok(response, msg));
    }

    protected ActionResult<MessageModel<T>> FailMessage<T>(string msg, int status = 500)
    {
        return StatusCode(status, MessageModel<T>.Fail(msg, status));
    }
}
