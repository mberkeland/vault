//
//  ClientManager.m
//  VonageVault
//
//  Created by iujie on 09/03/2026.
//

#import "ClientManager.h"
#import "EventEmitter.h"
#import <VonageClientSDKVoice/VonageClientSDKVoice.h>
#import <AVFoundation/AVFoundation.h>

@interface ClientManager ()
@property VGVoiceClient *client;
@property (nonatomic, assign) BOOL isMutedInternal;
@property (nonatomic, assign) BOOL isSpeaker;
@end

@implementation ClientManager

RCT_EXPORT_MODULE();

+ (nonnull ClientManager *)shared {
  static ClientManager *sharedInstance = nil;
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    sharedInstance = [ClientManager new];
    [sharedInstance setupClient];
  });
  return sharedInstance;
}

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (void)setupClient {
  VGVoiceClient.isUsingCallKit = NO;
  self.client = [[VGVoiceClient alloc] init];
  VGClientConfig *config = [[VGClientConfig alloc] initWithRegion:VGConfigRegionUS];
  [self.client setConfig:config];
}

RCT_EXPORT_METHOD(login:(NSString *)jwt) {
  [ClientManager.shared.client createSession:jwt
                                    callback:^(NSError * _Nullable error, NSString * _Nullable sessionId) {
    if (error != nil) {
      [ClientManager.shared.eventEmitter sendStatusEventWith:@"Error"];
      return;
    } else {
      [ClientManager.shared.eventEmitter sendStatusEventWith:@"Connected"];
    }
  }];
}

RCT_EXPORT_METHOD(makeCall:(NSString *)number) {
  [ClientManager.shared.client serverCall:@{@"to": number} callback:^(NSError * _Nullable error, VGCallId  _Nullable call) {
    if (error != nil) {
      [ClientManager.shared.eventEmitter sendCallStateEventWith:@"Error"];
      return;
    }
    [ClientManager.shared.eventEmitter sendCallStateEventWith:@"On Call"];
    [ClientManager.shared setCallId:call];
    self.isMutedInternal = false;
    self.isSpeaker = false;
    [self enableNoiseSuppression];
  }];
}

RCT_EXPORT_METHOD(endCall) {
  [ClientManager.shared.client hangup:ClientManager.shared.callId callback:^(NSError * _Nullable error) {
    ClientManager.shared.callId  = nil;
    [ClientManager.shared.eventEmitter sendCallStateEventWith:@"Idle"];
  }];
}

RCT_EXPORT_METHOD(enableNoiseSuppression)
{
  [self.client enableNoiseSuppression:ClientManager.shared.callId
                             callback:^(NSError * _Nullable error) {
    if (error != nil) {
      NSLog(@"Error enabling noise suppression on Call: %@", error);
    } else {
      NSLog(@"Enabled noise suppression on Call with id: %@", ClientManager.shared.callId);
    }
  }];
}

RCT_EXPORT_METHOD(setMuted:(BOOL)domute) {
  if (!ClientManager.shared.callId) {
    return;
  }

  if (domute) {
    NSLog(@"set muted: %@", ClientManager.shared.callId);
    [ClientManager.shared.client mute:ClientManager.shared.callId
                             callback:^(NSError * _Nullable error) {
      if (error != nil) {
        NSLog(@"setMuted error calling mute: %@", error);
        return;
      }
      self.isMutedInternal = true;
    }];
  }
  else {
    NSLog(@"set unmuted: %@", ClientManager.shared.callId);
    [ClientManager.shared.client unmute:ClientManager.shared.callId
                               callback:^(NSError * _Nullable error) {
      if (error != nil) {
        NSLog(@"setMuted error calling unmute: %@", error);
        return;
      }
      self.isMutedInternal = false;
    }];
  }
  
}

RCT_EXPORT_METHOD(setSpeaker:(BOOL)toSpeaker) {
  if (!ClientManager.shared.callId) {
    return;
  }
  // Audio route changes MUST happen on the main thread to avoid crashes
  dispatch_async(dispatch_get_main_queue(), ^{
    AVAudioSession *session = [AVAudioSession sharedInstance];
    NSError *error = nil;

    if (toSpeaker) {
      NSLog(@"Switching to Speaker for call: %@", ClientManager.shared.callId);
      // Set the override to speaker
      [session overrideOutputAudioPort:AVAudioSessionPortOverrideSpeaker error:&error];
      if (error) {
        NSLog(@"Error switching to speaker: %@", error.localizedDescription);
      } else {
        self.isSpeaker = true;
      }
    } else {
      NSLog(@"Switching to Receiver for call: %@", ClientManager.shared.callId);
      // Remove the override to return to the default (Earpiece/Receiver)
      [session overrideOutputAudioPort:AVAudioSessionPortOverrideNone error:&error];
      if (error) {
        NSLog(@"Error switching to receiver: %@", error.localizedDescription);
      } else {
        self.isSpeaker = false;
      }
    }
  });
}

RCT_EXPORT_METHOD(isCallMuted:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@(self.isMutedInternal));
}

RCT_EXPORT_METHOD(isSpeaker:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@(self.isSpeaker));
}

@end
