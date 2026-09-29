const aiService = require('../services/aiService');
const supabase = require('../config/supabase');

const aiController = {
  async ask(req, res, next) {
    try {
      const { query, session_id } = req.body;
      const userId = req.user ? req.user.id : null;

      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Query text is required.',
          code: 'EMPTY_QUERY'
        });
      }

      // Process query with live database grounding
      const result = await aiService.processQuery({
        query,
        userPreferences: req.user ? req.user.preferences : {}
      });

      // Optionally record conversation for learning/analytics
      if (session_id || userId) {
        try {
          const sessId = session_id || 'sess_' + Date.now();
          let convId = null;

          const { data: conv } = await supabase
            .from('ai_conversations')
            .select('id')
            .eq('session_id', sessId)
            .maybeSingle();

          if (conv) {
            convId = conv.id;
          } else {
            const { data: newConv } = await supabase
              .from('ai_conversations')
              .insert([{ user_id: userId, session_id: sessId }])
              .select('id')
              .single();
            if (newConv) convId = newConv.id;
          }

          if (convId) {
            await supabase.from('ai_messages').insert([
              { conversation_id: convId, sender: 'user', text: query },
              { conversation_id: convId, sender: 'ai', text: result.reply, recommendations: result.recommendations }
            ]);
          }
        } catch (e) {
          // non-blocking
        }
      }

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = aiController;
