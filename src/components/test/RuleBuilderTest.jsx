import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import RuleBuilder from '@/components/shared/RuleBuilder';
import { showSuccess } from '@/utils/messaging';

export default function RuleBuilderTest() {
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);

  const handleRuleCreated = (rule) => {
    console.log('Rule created:', rule);
    showSuccess('כלל נוצר בהצלחה!', 'בדוק את הקונסול לפרטים');
    setShowRuleBuilder(false);
  };

  const handleCancel = () => {
    setShowRuleBuilder(false);
  };

  return (
    <div className="p-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">בדיקת RuleBuilder</h1>

      <Button
        onClick={() => setShowRuleBuilder(true)}
        className="mb-4"
      >
        פתח RuleBuilder
      </Button>

      {showRuleBuilder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-6xl max-h-[90vh] overflow-y-auto w-full mx-4">
            <RuleBuilder
              onRuleCreated={handleRuleCreated}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
}