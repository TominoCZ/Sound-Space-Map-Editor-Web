using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.SignalR;

namespace SoundSpaceMapEditorWeb
{
    public class MapperHub : Hub
    {
        public IHostingEnvironment Env { get; }

        public MapperHub(IHostingEnvironment env)
        {
            Env = env;
        }
        private static object _downloadLocker = new object();

        private string GetPath(string id)
        {
            return $"cached/{id}.mp3";
        }

        private Task<bool> TryGet(string id)
        {
            lock (_downloadLocker)
            {
                try
                {
                    var path = Path.Combine(Env.WebRootPath, GetPath(id));

                    Directory.CreateDirectory(Path.GetDirectoryName(path));

                    if (!File.Exists(path))
                    {
                        using (var wc = new SecureWebClient())
                        {
                            wc.DownloadFile("https://assetgame.roblox.com/asset/?id=" + id, path);
                        }
                    }

                    return Task.FromResult(true);
                }
                catch
                {

                }
            }

            return Task.FromResult(false);
        }

        public async Task AttemptLoad(string text)
        {
            var index = text.IndexOf(',');

            if (index <= 0)
            {
                await Clients.Caller.SendAsync("LoadFail");

                return;
            }

            var id = text.Substring(0, index);
            var data = text.Substring(index + 1);

            var ok = await TryGet(id);

            if (!ok)
            {
                await Clients.Caller.SendAsync("LoadFail");

                return;
            }

            var link = GetPath(id);

            data = $"/{link},{data}";

            await Clients.Caller.SendAsync("LoadSuccess", data);
        }
    }
}
