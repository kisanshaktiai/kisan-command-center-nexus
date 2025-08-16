
export const onboardingTranslations = {
  en: {
    onboarding: {
      title: "Welcome to Your Platform Setup",
      subtitle: "Let's get your organization set up in just a few steps",
      progress: "Step {{current}} of {{total}}",
      
      steps: {
        businessVerification: {
          title: "Business Verification",
          description: "Verify your business details and documents",
          fields: {
            companyName: "Company Name",
            gstNumber: "GST Number",
            panNumber: "PAN Number",
            registrationCertificate: "Registration Certificate",
            addressProof: "Address Proof"
          },
          help: {
            gstNumber: "Enter your 15-digit GST identification number",
            panNumber: "Enter your 10-character PAN number"
          }
        },
        planSelection: {
          title: "Choose Your Plan",
          description: "Select the plan that best fits your needs",
          fields: {
            planType: "Plan Type",
            billingCycle: "Billing Cycle",
            addOns: "Add-ons"
          }
        },
        branding: {
          title: "Customize Your Branding",
          description: "Make the platform your own",
          fields: {
            logo: "Company Logo",
            primaryColor: "Primary Color",
            secondaryColor: "Secondary Color",
            companyDescription: "Company Description"
          }
        },
        featureToggles: {
          title: "Configure Features",
          description: "Enable the features you need",
          fields: {
            enabledFeatures: "Enabled Features",
            permissions: "Permissions"
          }
        },
        teamInvites: {
          title: "Invite Your Team",
          description: "Add team members to get started",
          fields: {
            invites: "Team Invitations"
          }
        },
        confirmation: {
          title: "Review & Confirm",
          description: "Review your setup before completion"
        }
      },
      
      actions: {
        next: "Next Step",
        previous: "Previous Step",
        save: "Save Progress",
        complete: "Complete Setup",
        retry: "Retry",
        skip: "Skip Step",
        edit: "Edit",
        cancel: "Cancel"
      },
      
      status: {
        pending: "Pending",
        inProgress: "In Progress",
        completed: "Completed",
        failed: "Failed",
        skipped: "Skipped"
      },
      
      messages: {
        autoSaved: "Progress automatically saved",
        saveError: "Failed to save progress. Please try again.",
        validationError: "Please fix the errors below",
        completionSuccess: "Onboarding completed successfully!",
        resuming: "Resuming from where you left off..."
      }
    }
  }
};

export type OnboardingTranslations = typeof onboardingTranslations.en;
