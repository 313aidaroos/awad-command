import {beforeEach,describe,it,expect,vi} from 'vitest';
vi.mock('@/lib/leadOwner',()=>({isLeadOwner:vi.fn(async()=>true)}));
vi.mock('@/lib/leadThread',()=>({loadLeadThread:vi.fn(async()=>[{id:'reply',projectSlug:'apixis',message:'Test reply',direction:'inbound'}])}));
import {isLeadOwner} from '@/lib/leadOwner';
import {loadLeadThread} from '@/lib/leadThread';
import {GET} from './route';
beforeEach(()=>{vi.clearAllMocks();vi.mocked(isLeadOwner).mockResolvedValue(true);});
describe('private lead conversations',()=>{
 it('does not load messages for signed-out visitors',async()=>{vi.mocked(isLeadOwner).mockResolvedValue(false);const r=await GET(new Request('http://local/api/lead-thread?projectSlug=apixis'));expect(r.status).toBe(401);expect(loadLeadThread).not.toHaveBeenCalled();});
 it('loads only the selected configured lead and returns replies',async()=>{const r=await GET(new Request('http://local/api/lead-thread?projectSlug=apixis'));expect(r.status).toBe(200);expect(loadLeadThread).toHaveBeenCalledWith('apixis');expect(await r.json()).toMatchObject({projectSlug:'apixis',messages:[{direction:'inbound',message:'Test reply'}]});});
 it('rejects unconfigured leads without reading messages',async()=>{const r=await GET(new Request('http://local/api/lead-thread?projectSlug=unknown'));expect(r.status).toBe(404);expect(loadLeadThread).not.toHaveBeenCalled();});
});
