import React, { useState, useEffect } from 'react';
import { MessageSquare, ArrowLeftRight, Check, X, Send, User, Clock, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import { getExchangeRequests, acceptExchangeRequest, declineExchangeRequest } from '../services/exchangeService';
import { getConversations, getConversation, sendMessage } from '../services/conversationService';
import { useAuth } from '../context/AuthContext';

export const MessagesPage = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('messages'); // 'messages' | 'requests'
  const [requests, setRequests] = useState({ incoming: [], outgoing: [] });
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [messageText, setMessageText] = useState('');

  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchExchangeRequests = async () => {
    try {
      const res = await getExchangeRequests();
      if (res?.data) {
        setRequests(res.data);
      }
    } catch (e) {
      console.warn('[Requests Fetch Error]', e.message);
    }
  };

  const fetchConversationsList = async () => {
    try {
      const res = await getConversations();
      if (res?.data?.conversations) {
        setConversations(res.data.conversations);
        if (res.data.conversations.length > 0 && !activeConversationId) {
          setActiveConversationId(res.data.conversations[0]._id);
        }
      }
    } catch (e) {
      console.warn('[Conversations Fetch Error]', e.message);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchExchangeRequests(), fetchConversationsList()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      const loadChatMessages = async () => {
        setChatLoading(true);
        try {
          const res = await getConversation(activeConversationId);
          if (res?.data) {
            setActiveChat(res.data);
          }
        } catch (e) {
          console.warn('[Chat Fetch Error]', e.message);
        } finally {
          setChatLoading(false);
        }
      };
      loadChatMessages();
    }
  }, [activeConversationId]);

  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptExchangeRequest(requestId);
      await loadData();
      setActiveTab('messages');
    } catch (e) {
      alert(e.message || 'Failed to accept exchange request');
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      await declineExchangeRequest(requestId);
      await fetchExchangeRequests();
    } catch (e) {
      alert(e.message || 'Failed to decline exchange request');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversationId) return;

    setSending(true);
    try {
      const res = await sendMessage(activeConversationId, messageText.trim());
      setMessageText('');

      // Refresh chat messages
      const updatedChat = await getConversation(activeConversationId);
      if (updatedChat?.data) {
        setActiveChat(updatedChat.data);
      }
      fetchConversationsList();
    } catch (e) {
      alert(e.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <PageContainer
      title="Exchange Communication Workspace"
      subtitle="Manage incoming exchange requests and active peer learning conversations."
      action={
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'messages' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Conversations ({conversations.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'requests' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Exchange Requests</span>
            {requests.incoming?.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">
                {requests.incoming.length}
              </span>
            )}
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" label="Loading conversations & requests..." />
        </div>
      ) : activeTab === 'requests' ? (
        /* REQUESTS MANAGEMENT TAB */
        <div className="space-y-8 max-w-4xl mx-auto">
          
          {/* Incoming Requests */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-teal-600" /> Incoming Exchange Proposals ({requests.incoming?.length || 0})
            </h3>
            {requests.incoming?.length === 0 ? (
              <Card>
                <EmptyState
                  icon={ArrowLeftRight}
                  title="No Incoming Exchange Requests"
                  description="When matching peers express interest in exchanging skills for your goals, requests will appear here."
                />
              </Card>
            ) : (
              <div className="space-y-4">
                {requests.incoming.map((req) => (
                  <Card key={req._id} className="border-teal-200 bg-gradient-to-r from-white to-teal-50/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-900">{req.sender?.name || 'Peer Candidate'}</span>
                        <p className="text-[11px] text-slate-500">Goal: {req.goal?.title || 'Active Goal'}</p>
                      </div>
                      <Badge variant="teal">Exchange Proposal</Badge>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs mb-4">
                      <p className="text-slate-700 italic">"{req.proposedExchange}"</p>
                      <div className="mt-2 pt-2 border-t border-slate-100 font-semibold text-teal-700 flex items-center gap-2">
                        <span>They offer: <strong>{req.offeredSkill}</strong></span>
                        <span>&harr;</span>
                        <span>They request: <strong>{req.requestedSkill}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      <Button variant="outline" size="sm" onClick={() => handleDeclineRequest(req._id)} leftIcon={X}>
                        Decline
                      </Button>
                      <Button size="sm" onClick={() => handleAcceptRequest(req._id)} leftIcon={Check}>
                        Accept & Start Chat
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Requests */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
              Outgoing Sent Proposals ({requests.outgoing?.length || 0})
            </h3>
            {requests.outgoing?.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No outgoing requests sent yet.</p>
            ) : (
              <div className="space-y-3">
                {requests.outgoing.map((req) => (
                  <div key={req._id} className="p-4 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs shadow-subtle">
                    <div>
                      <p className="font-bold text-slate-900">To: {req.recipient?.name || 'Peer'}</p>
                      <p className="text-[11px] text-slate-500">Proposed: Exchanging {req.offeredSkill} for {req.requestedSkill}</p>
                    </div>
                    <Badge variant={req.status === 'ACCEPTED' ? 'emerald' : req.status === 'DECLINED' ? 'rose' : 'slate'}>
                      {req.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ACTIVE MESSAGING CHAT TAB */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] max-w-6xl mx-auto">
          
          {/* Left Column: Conversations List */}
          <Card className="md:col-span-1 flex flex-col p-4 overflow-hidden">
            <div className="mb-3 pb-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Conversations</span>
              <Badge variant="teal">{conversations.length}</Badge>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {conversations.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No active conversations yet. Accept an exchange request to open a chat.
                </div>
              ) : (
                conversations.map((conv) => {
                  const otherParticipant = conv.participants?.find((p) => p._id !== user?._id) || conv.participants?.[0] || {};
                  const isActive = conv._id === activeConversationId;

                  return (
                    <div
                      key={conv._id}
                      onClick={() => setActiveConversationId(conv._id)}
                      className={`p-3 rounded-xl cursor-pointer transition-colors border ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs">{otherParticipant.name || 'Exchange Partner'}</span>
                        <span className={`text-[10px] ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                          {conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className={`text-xs truncate ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                        {conv.lastMessage?.text || 'Start chatting...'}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Right Column: Chat Box */}
          <Card className="md:col-span-2 flex flex-col p-4 overflow-hidden">
            {chatLoading ? (
              <div className="flex-1 flex justify-center items-center">
                <LoadingSpinner size="md" label="Loading chat history..." />
              </div>
            ) : !activeChat ? (
              <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-400 text-xs">
                <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                Select a conversation from the sidebar to start messaging.
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full">
                
                {/* Chat Header */}
                <div className="pb-3 mb-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                      {activeChat.conversation?.participants?.[0]?.name?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">
                        {activeChat.conversation?.participants?.map((p) => p.name).join(' & ')}
                      </h4>
                      <span className="text-[10px] text-teal-600 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Active Exchange Session
                      </span>
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" onClick={() => setActiveConversationId(activeConversationId)} leftIcon={RefreshCw}>
                    Sync
                  </Button>
                </div>

                {/* Message Log Thread */}
                <div className="flex-1 overflow-y-auto space-y-3 p-2 bg-slate-50/50 rounded-xl mb-4 border border-slate-100">
                  {activeChat.messages?.map((msg) => {
                    const isSelf = msg.sender?._id === user?._id || msg.sender === user?._id;

                    return (
                      <div
                        key={msg._id}
                        className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl text-xs ${
                            isSelf
                              ? 'bg-teal-600 text-white rounded-br-none shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-subtle'
                          }`}
                        >
                          <span className="block font-bold text-[10px] opacity-75 mb-0.5">
                            {isSelf ? 'You' : msg.sender?.name || 'Partner'}
                          </span>
                          <p className="leading-relaxed">{msg.text}</p>
                          <span className="block text-[9px] opacity-60 text-right mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Input Send Bar */}
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <Button type="submit" isLoading={sending} rightIcon={Send} size="sm">
                    Send
                  </Button>
                </form>

              </div>
            )}
          </Card>

        </div>
      )}
    </PageContainer>
  );
};

export default MessagesPage;
